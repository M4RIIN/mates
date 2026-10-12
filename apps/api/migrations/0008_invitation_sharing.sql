CREATE TABLE IF NOT EXISTS "invitation_guest_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"guest_key_hash" text NOT NULL,
	"name" text NOT NULL,
	"response_status" "response_status" NOT NULL,
	"responded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_guest_responses_status" CHECK ("invitation_guest_responses"."response_status" IN ('yes', 'no'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitation_share_links" (
	"invitation_id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"show_address" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_share_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitation_guest_responses" ADD CONSTRAINT "invitation_guest_responses_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitation_share_links" ADD CONSTRAINT "invitation_share_links_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invitation_guest_responses_identity_idx" ON "invitation_guest_responses" USING btree ("invitation_id","guest_key_hash");
