-- Shared identity rule for manual inserts, live creation and conservative backfill.
CREATE FUNCTION public.mates_establishment_key(venue_name text, venue_address text, lat double precision, lon double precision)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE
    WHEN nullif(btrim(regexp_replace(coalesce(venue_name, ''), '[[:space:]]+', ' ', 'g')), '') IS NULL THEN NULL
    WHEN nullif(btrim(regexp_replace(coalesce(venue_address, ''), '[[:space:]]+', ' ', 'g')), '') IS NOT NULL THEN
      'address:' || jsonb_build_array(lower(btrim(regexp_replace(venue_name, '[[:space:]]+', ' ', 'g'))), lower(btrim(regexp_replace(venue_address, '[[:space:]]+', ' ', 'g'))))::text
    WHEN lat BETWEEN -90 AND 90 AND lon BETWEEN -180 AND 180 THEN
      'coordinates:' || jsonb_build_array(lower(btrim(regexp_replace(venue_name, '[[:space:]]+', ' ', 'g'))), round(lat::numeric, 5)::text, round(lon::numeric, 5)::text)::text
    ELSE NULL
  END
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "establishment_external_refs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establishment_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	CONSTRAINT "establishment_external_refs_provider" CHECK ("establishment_external_refs"."provider" IN ('photon', 'mapbox', 'mock'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "establishments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"country_code" text,
	"listing_status" text DEFAULT 'unlisted' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"featured_radius_km" double precision DEFAULT 10 NOT NULL,
	"identity_key" text GENERATED ALWAYS AS (public.mates_establishment_key(name, address, latitude, longitude)) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "establishments_name" CHECK (char_length(btrim("establishments"."name")) BETWEEN 1 AND 160),
	CONSTRAINT "establishments_address" CHECK ("establishments"."address" IS NULL OR char_length("establishments"."address") <= 240),
	CONSTRAINT "establishments_listing" CHECK ("establishments"."listing_status" IN ('unlisted', 'listed', 'featured')),
	CONSTRAINT "establishments_country" CHECK ("establishments"."country_code" IS NULL OR "establishments"."country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "establishments_coordinates" CHECK (("establishments"."latitude" IS NULL AND "establishments"."longitude" IS NULL) OR ("establishments"."latitude" IS NOT NULL AND "establishments"."longitude" IS NOT NULL AND "establishments"."latitude" BETWEEN -90 AND 90 AND "establishments"."longitude" BETWEEN -180 AND 180)),
	CONSTRAINT "establishments_radius" CHECK ("establishments"."featured_radius_km" > 0 AND "establishments"."featured_radius_km" < 'Infinity'::float8),
	CONSTRAINT "establishments_featured_coordinates" CHECK ("establishments"."listing_status" <> 'featured' OR ("establishments"."latitude" IS NOT NULL AND "establishments"."longitude" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "invitation_guest_responses" ADD COLUMN "analytics_browser_id_hash" text;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "establishment_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "establishment_external_refs" ADD CONSTRAINT "establishment_external_refs_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "establishment_external_refs_unique_idx" ON "establishment_external_refs" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "establishment_external_refs_establishment_idx" ON "establishment_external_refs" USING btree ("establishment_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "establishments_identity_unique_idx" ON "establishments" USING btree ("identity_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "establishments_publication_idx" ON "establishments" USING btree ("active","listing_status");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitations" ADD CONSTRAINT "invitations_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitations_establishment_created_idx" ON "invitations" USING btree ("establishment_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitations_establishment_scheduled_idx" ON "invitations" USING btree ("establishment_id","scheduled_at");--> statement-breakpoint
ALTER TABLE "invitation_guest_responses" ADD CONSTRAINT "invitation_guest_responses_browser_hash" CHECK ("invitation_guest_responses"."analytics_browser_id_hash" IS NULL OR "invitation_guest_responses"."analytics_browser_id_hash" ~ '^[a-f0-9]{64}$');
--> statement-breakpoint
-- A historical name/address with divergent retained positions is ambiguous: leave it unresolved.
WITH candidates AS (
  SELECT *, public.mates_establishment_key(place_name, place_address, latitude, longitude) AS identity_key FROM invitations
), safe AS (
  SELECT identity_key, min(place_name) AS name, min(nullif(btrim(place_address), '')) AS address,
    min(latitude) FILTER (WHERE latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180) AS latitude,
    min(longitude) FILTER (WHERE latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180) AS longitude
  FROM candidates WHERE identity_key IS NOT NULL GROUP BY identity_key
  HAVING count(DISTINCT (round(latitude::numeric, 5), round(longitude::numeric, 5))) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) <= 1
)
INSERT INTO establishments (name, address, latitude, longitude)
SELECT name, address, latitude, longitude FROM safe ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE invitations i SET establishment_id = e.id FROM establishments e
WHERE i.establishment_id IS NULL AND e.identity_key = public.mates_establishment_key(i.place_name, i.place_address, i.latitude, i.longitude);
--> statement-breakpoint
-- Current positive responses only. UNION ALL avoids multiplying native x web rows.
CREATE VIEW establishment_participations AS
SELECT i.id AS invitation_id, i.establishment_id, i.scheduled_at, i.canceled_at,
  'mates'::text AS participant_type, r.user_id AS mates_user_id, NULL::text AS browser_id_hash,
  false AS web_identity_unknown
FROM invitations i JOIN invitation_recipients r ON r.invitation_id = i.id WHERE r.response_status = 'yes'
UNION ALL
SELECT i.id, i.establishment_id, i.scheduled_at, i.canceled_at,
  'web'::text, NULL::uuid, r.analytics_browser_id_hash, r.analytics_browser_id_hash IS NULL
FROM invitations i JOIN invitation_guest_responses r ON r.invitation_id = i.id WHERE r.response_status = 'yes';
--> statement-breakpoint
CREATE VIEW establishment_outing_summary AS
SELECT i.id AS invitation_id, i.establishment_id, i.place_name, i.place_address, i.created_at, i.scheduled_at, i.canceled_at,
  count(p.invitation_id)::integer AS confirmed_count,
  count(*) FILTER (WHERE p.participant_type = 'mates')::integer AS mates_confirmed_count,
  count(*) FILTER (WHERE p.participant_type = 'web')::integer AS web_confirmed_count,
  count(*) FILTER (WHERE p.web_identity_unknown)::integer AS web_unknown_identity_count
FROM invitations i LEFT JOIN establishment_participations p ON p.invitation_id = i.id
GROUP BY i.id;
