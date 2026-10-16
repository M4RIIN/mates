import { and, eq, inArray, sql } from "drizzle-orm";
import type { PlaceReference } from "@mates/shared";
import { normalizePlaceText } from "@mates/shared";
import type { CreateInvitationRecordInput } from "../../application/ports/invitation-repository.js";
import type { EstablishmentRepository } from "../../application/ports/establishment-repository.js";
import type { PlaceCandidate } from "../../application/ports/place-search-port.js";
import type { AppDb } from "../db/client.js";
import { establishments as venues, establishmentExternalRefs as refs } from "../db/schema.js";

type DbExecutor = Pick<AppDb, "select" | "insert" | "execute">;
function candidate(row: typeof venues.$inferSelect): PlaceCandidate {
  return { id: `establishment-${row.id}`, establishmentId: row.id, name: row.name, address: row.address, latitude: row.latitude, longitude: row.longitude };
}

export class PostgresEstablishmentRepository implements EstablishmentRepository {
  constructor(private readonly db: AppDb) {}

  async searchListed(query: string, limit: number): Promise<PlaceCandidate[]> {
    // strpos is literal: % and _ typed by users must not become SQL wildcards.
    const normalized = sql`lower(regexp_replace(btrim(${query}), '[[:space:]]+', ' ', 'g'))`;
    const name = sql`lower(regexp_replace(btrim(${venues.name}), '[[:space:]]+', ' ', 'g'))`;
    const rows = await this.db.select().from(venues).where(sql`${venues.active} AND ${venues.listingStatus} IN ('listed', 'featured') AND
      (strpos(${name}, ${normalized}) > 0 OR strpos(lower(coalesce(${venues.address}, '')), ${normalized}) > 0)`)
      .orderBy(sql`CASE WHEN ${name} = ${normalized} THEN 0 WHEN strpos(${name}, ${normalized}) = 1 THEN 1 ELSE 2 END`, venues.id)
      .limit(limit);
    if (rows.length === 0) return [];
    const references = await this.db.select().from(refs).where(inArray(refs.establishmentId, rows.map(row => row.id)));
    return rows.flatMap(row => {
      const matching = references.filter(ref => ref.establishmentId === row.id);
      return matching.length === 0 ? [candidate(row)] : matching.map(ref => ({ ...candidate(row), reference: { provider: ref.provider as PlaceReference["provider"], externalId: ref.externalId } }));
    });
  }

  async findFeatured(latitude: number, longitude: number): Promise<PlaceCandidate[]> {
    // Great-circle distance, clamped against floating-point errors; no PostGIS dependency.
    const distance = sql`6371.0088 * acos(least(1.0, greatest(-1.0,
      sin(radians(${latitude}::float8)) * sin(radians(${venues.latitude})) +
      cos(radians(${latitude}::float8)) * cos(radians(${venues.latitude})) * cos(radians(${venues.longitude} - ${longitude}::float8)))))`;
    const rows = await this.db.select().from(venues)
      .where(sql`${venues.active} AND ${venues.listingStatus} = 'featured' AND ${distance} <= ${venues.featuredRadiusKm}`)
      .orderBy(sql`${venues.priority} DESC`, distance, venues.id).limit(2);
    return rows.map(candidate);
  }
}

// Runs inside invitation creation's transaction: no orphan venue if creation fails.
export async function resolveEstablishment(db: DbExecutor, input: CreateInvitationRecordInput): Promise<string | null> {
  const keyExpression = sql`public.mates_establishment_key(${input.placeName}, ${input.placeAddress}, ${input.latitude}::float8, ${input.longitude}::float8)`;
  const [computed] = await db.select({ key: keyExpression.as("key") }).from(sql`(SELECT 1) AS constant`);
  const key = computed?.key as string | null;
  let reference = input.placeReference;
  if (input.establishmentId !== undefined) {
    const [selected] = await db.select().from(venues).where(eq(venues.id, input.establishmentId));
    // An edited snapshot cannot silently retain the original venue identity.
    if (selected && ((key !== null && selected.identityKey === key) ||
      (key === null && selected.identityKey === null && normalizePlaceText(selected.name) === normalizePlaceText(input.placeName) &&
       normalizePlaceText(selected.address ?? "") === normalizePlaceText(input.placeAddress ?? "") &&
       selected.latitude === input.latitude && selected.longitude === input.longitude))) return selected.id;
    reference = undefined;
  }

  // Serialize matching by source and fallback identity, including concurrent creates.
  // All callers acquire source before identity to avoid deadlocks.
  if (reference !== undefined) {
    await db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`venue:${reference.provider}:${reference.externalId}`}, 0))`);
    const [existing] = await db.select().from(refs).where(and(eq(refs.provider, reference.provider), eq(refs.externalId, reference.externalId)));
    if (existing) return existing.establishmentId;
  }
  if (key === null && reference === undefined) return null;
  if (key !== null) await db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`venue-key:${key}`}, 0))`);
  let venue = key !== null ? (await db.select().from(venues).where(eq(venues.identityKey, key)))[0] : undefined;
  if (!venue) {
    [venue] = await db.insert(venues).values({
      name: input.placeName, address: input.placeAddress,
      latitude: input.latitude !== null && input.longitude !== null ? input.latitude : null,
      longitude: input.latitude !== null && input.longitude !== null ? input.longitude : null
    }).onConflictDoNothing().returning();
    if (!venue && key !== null) [venue] = await db.select().from(venues).where(eq(venues.identityKey, key));
  }
  if (!venue) throw new Error("Establishment resolution failed");
  if (reference !== undefined) {
    await db.insert(refs).values({ establishmentId: venue.id, ...reference }).onConflictDoNothing();
  }
  return venue.id;
}
