import { createHash, randomUUID } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createInvitationRequestSchema, guestRespondRequestSchema, mergePlaceResults, type PlaceCandidateDto } from "@mates/shared";
import { buildInvitationPlaceInput } from "../../mobile/src/domain/invitation/place-input.js";
import { migrateDatabase, migrationsFolder } from "../src/infrastructure/db/migrate.js";
import * as schema from "../src/infrastructure/db/schema.js";
import { PostgresInvitationRepository } from "../src/infrastructure/repositories/postgres-invitation.repository.js";
import { PostgresEstablishmentRepository } from "../src/infrastructure/repositories/postgres-establishment.repository.js";
import { PostgresInvitationSharingRepository } from "../src/infrastructure/repositories/postgres-invitation-sharing.repository.js";
import { InvitationSharingUseCase } from "../src/application/use-cases/invitation-sharing.use-case.js";
import { SearchPlacesUseCase } from "../src/application/use-cases/search-places.use-case.js";
import { createHttpApp } from "../src/http/app.js";
import type { AppContainer } from "../src/infrastructure/container.js";

const place = (id: string, name: string, address = "12 rue A"): PlaceCandidateDto => ({ id, name, address, latitude: 48.85, longitude: 2.35 });
describe("establishment contracts and result merging", () => {
  it("keeps old clients valid and strips selected identity on address edits", () => {
    const selected = { ...place("provider", "Café"), establishmentId: randomUUID(), reference: { provider: "photon" as const, externalId: "N-123" } };
    expect(buildInvitationPlaceInput(selected, "Café", "12 rue A")).toMatchObject({ establishmentId: selected.establishmentId, placeReference: selected.reference });
    expect(buildInvitationPlaceInput(selected, "Café", "20 rue B")).toEqual({ placeName: "Café", placeAddress: "20 rue B" });
    expect(createInvitationRequestSchema.safeParse({ placeName: "Café", scheduledAt: new Date().toISOString() }).success).toBe(true);
    expect(guestRespondRequestSchema.safeParse({ guestKey: "a".repeat(64), name: "Camille", status: "yes" }).success).toBe(true);
    expect(guestRespondRequestSchema.safeParse({ guestKey: "a".repeat(64), name: "Camille", status: "yes", analyticsBrowserId: "bad" }).success).toBe(false);
  });
  it("ranks exact names then prefixes, retaining supplier order on ties and homonyms", () => {
    const supplier = [place("1", "Le Café"), place("2", "Café Nord"), place("3", "Café"), place("4", "Café", "20 rue B")];
    const manual = [{ ...place("manual", "Café"), establishmentId: randomUUID() }, place("5", "Café Sud")];
    const results = mergePlaceResults(supplier, manual, "café");
    expect(results.map(p => p.name)).toEqual(["Café", "Café", "Café Nord", "Café Sud", "Le Café"]);
    expect(results[0]?.establishmentId).toBe(manual[0]?.establishmentId);
    expect(mergePlaceResults([place("a", "Chez moi", "")], [place("b", "Chez moi", "")], "chez")).toHaveLength(1);
    expect(mergePlaceResults([{ ...place("a", "Chez moi", ""), latitude: null }], [{ ...place("b", "Chez moi", ""), latitude: null }], "chez")).toHaveLength(2);
  });
  it("deduplicates a catalog reference even when the provider formats the address differently", () => {
    const reference = { provider: "photon" as const, externalId: "N-123" };
    const id = randomUUID();
    expect(mergePlaceResults([{ ...place("osm", "Café", "12 rue A, Paris, France"), reference }], [{ ...place("manual", "Café"), reference, establishmentId: id }], "café")).toEqual([{ ...place("manual", "Café"), reference, establishmentId: id }]);
  });
  it("degrades independently when either source fails", async () => {
    const catalog = { searchListed: vi.fn(async () => [place("manual", "Café")]), findFeatured: vi.fn(async () => []) };
    const search = new SearchPlacesUseCase({ search: async () => { throw new Error("offline"); } }, catalog);
    expect(await search.execute("café")).toHaveLength(1);
    catalog.searchListed.mockRejectedValue(new Error("catalog offline"));
    expect(await new SearchPlacesUseCase({ search: async () => [place("external", "Café")] }, catalog).execute("café")).toHaveLength(1);
    catalog.findFeatured.mockRejectedValue(new Error("offline"));
    expect(await search.featured(48.85, 2.35)).toEqual([]);
  });
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("establishments and statistics on PostgreSQL", () => {
  const databaseName = `mates_places_test_${randomUUID().replaceAll("-", "")}`;
  const owner = randomUUID(), camille = randomUUID();
  let admin: ReturnType<typeof postgres>, sql: ReturnType<typeof postgres>;
  let invitations: PostgresInvitationRepository, catalog: PostgresEstablishmentRepository, sharing: InvitationSharingUseCase;
  let http: ReturnType<typeof createHttpApp>;
  const historicalKnown = randomUUID(), historicalHomonym = randomUUID(), historicalUnknown = randomUUID();
  const ambiguous = [randomUUID(), randomUUID()];
  beforeAll(async () => {
    admin = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
    await admin`CREATE DATABASE ${admin(databaseName)}`;
    const url = new URL(process.env.TEST_DATABASE_URL!); url.pathname = `/${databaseName}`;
    sql = postgres(url.toString(), { max: 8, onnotice: () => undefined });
    // Upgrade a populated pre-feature database, rather than testing only an empty install.
    const fixture = await mkdtemp(join(tmpdir(), "mates-establishments-"));
    try {
      await cp(migrationsFolder, fixture, { recursive: true });
      const journal = JSON.parse(await readFile(join(fixture, "meta/_journal.json"), "utf8"));
      await writeFile(join(fixture, "meta/_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.slice(0, -1) }));
      await migrate(drizzle(sql), { migrationsFolder: fixture });
      await sql`INSERT INTO users (id, pseudo, public_tag) VALUES (${owner}, 'Alex', 'Alex#1234'), (${camille}, 'Camille', 'Camille#1234')`;
      for (const [id, name, address, lat] of [
        [historicalKnown, "Café historique", "12 rue A", 48.85],
        [historicalHomonym, "Café historique", "20 rue B", 48.85],
        [historicalUnknown, "Chez quelqu’un", null, null],
        [ambiguous[0], "Adresse ambiguë", "12 rue A", 48.85],
        [ambiguous[1], "Adresse ambiguë", "12 rue A", 50.85]
      ] as const) {
        await sql`INSERT INTO invitations (id, creator_id, place_name, place_address, latitude, longitude, scheduled_at) VALUES (${id!}, ${owner}, ${name}, ${address}, ${lat}, ${lat === null ? null : 2.35}, '2019-01-01')`;
      }
      await migrateDatabase(url.toString());
      await migrateDatabase(url.toString());
    } finally { await rm(fixture, { recursive: true, force: true }); }
    const db = drizzle(sql, { schema });
    invitations = new PostgresInvitationRepository(db);
    catalog = new PostgresEstablishmentRepository(db);
    sharing = new InvitationSharingUseCase(invitations, new PostgresInvitationSharingRepository(db), { publishToUsers: async () => undefined, publishToUser: async () => undefined });
    http = createHttpApp({ useCases: { searchPlaces: new SearchPlacesUseCase({ search: async () => [] }, catalog), invitationSharing: sharing } } as unknown as AppContainer);
  }, 30_000);
  afterAll(async () => {
    await sql?.end();
    if (admin) { await admin`DROP DATABASE IF EXISTS ${admin(databaseName)} WITH (FORCE)`; await admin.end(); }
  });
  async function create(name = "Café test", address: string | null = "12 rue A", extras = {}) {
    return invitations.create({ creatorId: owner, friendGroupId: null, placeName: name, placeAddress: address, latitude: 48.85, longitude: 2.35, scheduledAt: new Date(Date.now() + 3600000), ...extras });
  }
  it("backfills safe historical identities, preserves snapshots, and leaves ambiguity unresolved", async () => {
    const rows = await sql`SELECT id, establishment_id, place_name, place_address FROM invitations ORDER BY id`;
    expect(rows.find(r => r.id === historicalKnown)?.establishment_id).toBeTruthy();
    expect(rows.find(r => r.id === historicalHomonym)?.establishment_id).not.toBe(rows.find(r => r.id === historicalKnown)?.establishment_id);
    for (const id of [historicalUnknown, ...ambiguous]) expect(rows.find(r => r.id === id)?.establishment_id).toBeNull();
    expect(rows.find(r => r.id === historicalKnown)?.place_address).toBe("12 rue A");
    expect(await catalog.searchListed("historique", 8)).toEqual([]);
  });
  it("resolves normalized name/address, coordinate fallback and provider aliases under concurrency", async () => {
    const reference = { provider: "photon", externalId: "N-789" };
    const created = await Promise.all(Array.from({ length: 4 }, () => create("Café concurrent", "10 rue C", { placeReference: reference })));
    const ids = created.map(x => x.id);
    const rows = await sql`SELECT DISTINCT establishment_id FROM invitations WHERE id IN ${sql(ids)}`;
    expect(rows).toHaveLength(1);
    const alias = await create("Café rebaptisé", "Autre format", { placeReference: reference });
    expect((await sql`SELECT establishment_id FROM invitations WHERE id = ${alias.id}`)[0]?.establishment_id).toBe(rows[0]?.establishment_id);
    const normalized = await create("  CAFÉ   concurrent ", " 10   rue C ");
    expect((await sql`SELECT establishment_id FROM invitations WHERE id = ${normalized.id}`)[0]?.establishment_id).toBe(rows[0]?.establishment_id);
    const homonym = await create("Café concurrent", "20 rue C");
    expect((await sql`SELECT establishment_id FROM invitations WHERE id = ${homonym.id}`)[0]?.establishment_id).not.toBe(rows[0]?.establishment_id);
    const coordinates = await create("Parc test", null, { latitude: 48.123451, longitude: 2.123451 });
    const coordinates2 = await create("Parc test", null, { latitude: 48.123452, longitude: 2.123452 });
    expect((await sql`SELECT count(DISTINCT establishment_id)::int AS count FROM invitations WHERE id IN ${sql([coordinates.id, coordinates2.id])}`)[0]?.count).toBe(1);
    const edited = await create("Café concurrent", "99 rue corrigée", { establishmentId: rows[0]!.establishment_id, placeReference: reference });
    expect((await sql`SELECT establishment_id FROM invitations WHERE id = ${edited.id}`)[0]?.establishment_id).not.toBe(rows[0]?.establishment_id);
  });
  it("counts current yes responses, browser estimates, legacy unknowns and mixed group sizes exactly once", async () => {
    const a = await create("Café métriques"), b = await create("Café métriques"), empty = await create("Café métriques");
    const canceled = await create("Café métriques"), future = await create("Café métriques");
    for (const outing of [a, b, canceled, future]) {
      await invitations.addRecipients(outing.id, [camille]);
      await sql`UPDATE invitation_recipients SET response_status = 'yes', responded_at = now() WHERE invitation_id = ${outing.id}`;
    }
    const browser = randomUUID();
    const linkA = await sharing.enable(a.id, owner), linkB = await sharing.enable(b.id, owner);
    const first = await sharing.respond(linkA.token, { guestKey: "a".repeat(64), name: "Sam", status: "yes", analyticsBrowserId: browser });
    await sharing.respond(linkB.token, { guestKey: "b".repeat(64), name: "Sam", status: "yes", analyticsBrowserId: browser });
    await sharing.respond(linkA.token, { guestKey: "c".repeat(64), name: "Ancien client", status: "yes" });
    // A retry/old client updates the same row and must not wipe the browser hash.
    await sharing.respond(linkA.token, { guestKey: "a".repeat(64), name: "Sam", status: "yes" });
    expect((await sql`SELECT analytics_browser_id_hash FROM invitation_guest_responses WHERE id = ${first.id}`)[0]?.analytics_browser_id_hash).toBe(createHash("sha256").update(browser).digest("hex"));
    expect(first).not.toHaveProperty("analyticsBrowserIdHash");
    await sql`UPDATE invitations SET scheduled_at = '2020-06-15T17:00:00Z', created_at = '2020-06-01T17:00:00Z' WHERE id IN ${sql([a.id, b.id, empty.id, canceled.id])}`;
    await sql`UPDATE invitations SET canceled_at = now() WHERE id = ${canceled.id}`;
    for (let n = 0; n < 2; n++) await sql`INSERT INTO invitation_audit_events (invitation_id, actor_user_id, event_type, place_name, scheduled_at, invited_count)
      VALUES (${a.id}, ${camille}, 'accepted', 'Café métriques', '2020-06-15T17:00:00Z', 1)`;
    const counts = async () => (await sql`SELECT count(*)::int AS total, count(DISTINCT mates_user_id)::int AS mates,
      count(DISTINCT browser_id_hash)::int AS web, count(*) FILTER (WHERE web_identity_unknown)::int AS unknown
      FROM establishment_participations WHERE scheduled_at >= '2020-06-01' AND scheduled_at < '2020-07-01' AND scheduled_at <= now() AND canceled_at IS NULL`)[0];
    expect(await counts()).toMatchObject({ total: 5, mates: 1, web: 1, unknown: 1 });
    const summary = await sql`SELECT avg(confirmed_count)::float8 AS average FROM establishment_outing_summary WHERE scheduled_at >= '2020-06-01' AND scheduled_at < '2020-07-01' AND canceled_at IS NULL AND scheduled_at <= now() AND confirmed_count > 0`;
    expect(summary[0]?.average).toBe(2.5);
    await sql`UPDATE invitation_recipients SET delay_minutes = 15 WHERE invitation_id = ${a.id}`;
    expect((await counts())?.total).toBe(5);
    await sql`UPDATE invitation_guest_responses SET response_status = 'no' WHERE id = ${first.id}`;
    expect(await counts()).toMatchObject({ total: 4, mates: 1, web: 1, unknown: 1 });
    expect((await sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE canceled_at IS NOT NULL)::int AS canceled FROM invitations WHERE created_at >= '2020-06-01' AND created_at < '2020-07-01'`)[0]).toMatchObject({ total: 4, canceled: 1 });
  });
  it("executes the delivered SQL with inclusive/exclusive Paris bounds and reports missing coverage", async () => {
    const start = await create("Café bornes"), end = await create("Café bornes");
    for (const [outing, date] of [[start, "2020-06-01 00:00:00 Europe/Paris"], [end, "2020-07-01 00:00:00 Europe/Paris"]] as const) {
      await invitations.addRecipients(outing.id, [camille]);
      await sql`UPDATE invitation_recipients SET response_status = 'yes' WHERE invitation_id = ${outing.id}`;
      await sql`UPDATE invitations SET created_at = ${date}::timestamptz, scheduled_at = ${date}::timestamptz WHERE id = ${outing.id}`;
    }
    const source = (await readFile(new URL("../../mobile/sql/place_invitation_stats.sql", import.meta.url), "utf8"))
      .replaceAll("2026-10-01", "2020-06-01").replaceAll("2026-11-01", "2020-07-01");
    const results = [];
    for (const statement of source.split(";").filter(s => s.trim())) results.push(await sql.unsafe(statement));
    expect(results[0]?.find(r => r.name === "Café bornes")?.invitations_created).toBe("1");
    expect(results[1]?.find(r => r.name === "Café bornes")).toMatchObject({ confirmed_participations: "1", unique_mates_accounts: "1", estimated_total_unique: "1", average_confirmed_group_size: "1.00" });
    expect(results[1]?.find(r => r.name === "Café métriques")).toMatchObject({ confirmed_participations: "4", unique_mates_accounts: "1", estimated_unique_web_browsers: "1", estimated_total_unique: "2", web_participations_identity_unknown: "1", average_confirmed_group_size: "2.00" });
  });
  it("keeps source-only identities and rolls back reference creation if an invitation fails", async () => {
    const reference = { provider: "mapbox", externalId: "source-only" };
    const a = await create("Source only", null, { latitude: null, longitude: null, placeReference: reference });
    const b = await create("Source only", null, { latitude: null, longitude: null, placeReference: reference });
    expect((await sql`SELECT count(DISTINCT establishment_id)::int AS count FROM invitations WHERE id IN ${sql([a.id, b.id])}`)[0]?.count).toBe(1);
    await expect(create("Échec transaction", "1 rue rollback", { creatorId: randomUUID() })).rejects.toThrow();
    expect(await sql`SELECT id FROM establishments WHERE name = 'Échec transaction'`).toHaveLength(0);
    const [catalogEntry] = await sql`INSERT INTO establishments (name, listing_status) VALUES ('Lieu publié sans adresse', 'listed') RETURNING id`;
    const selected = await create("Lieu publié sans adresse", null, { latitude: null, longitude: null, establishmentId: catalogEntry!.id });
    expect((await sql`SELECT establishment_id FROM invitations WHERE id = ${selected.id}`)[0]?.establishment_id).toBe(catalogEntry!.id);
  });
  it("publishes only active catalog entries, filters radius, sorts priority/distance/id and supports search without GPS", async () => {
    const db = drizzle(sql, { schema });
    const entries = await db.insert(schema.establishments).values([
      { name: "Catalogue proche", address: "1 rue catalogue", latitude: 48.85, longitude: 2.35, listingStatus: "featured", priority: 1 },
      { name: "Catalogue prioritaire", address: "2 rue catalogue", latitude: 48.86, longitude: 2.35, listingStatus: "featured", priority: 5 },
      { name: "Catalogue hors rayon", address: "3 rue catalogue", latitude: 50.85, longitude: 2.35, listingStatus: "featured", priority: 99 },
      { name: "Catalogue désactivé", address: "4 rue catalogue", latitude: 48.85, longitude: 2.35, listingStatus: "featured", active: false },
      { name: "Catalogue privé", address: "5 rue catalogue", latitude: 48.85, longitude: 2.35 },
      { name: "Catalogue publié", address: "6 rue catalogue", listingStatus: "listed" }
    ]).returning();
    expect((await catalog.findFeatured(48.85, 2.35)).map(p => p.name)).toEqual(["Catalogue prioritaire", "Catalogue proche"]);
    expect((await catalog.searchListed("Catalogue", 10)).map(p => p.name).sort()).toEqual(["Catalogue hors rayon", "Catalogue proche", "Catalogue prioritaire", "Catalogue publié"].sort());
    const response = await http.request("/places/search?q=Catalogue&limit=10");
    expect(response.status).toBe(200);
    expect((await response.json()).places).toHaveLength(4);
    expect((await http.request("/places/featured?latitude=91&longitude=2")).status).toBe(400);
    expect((await (await http.request("/places/featured?latitude=48.85&longitude=2.35")).json()).places).toHaveLength(2);
    await sql`UPDATE establishments SET active = false WHERE id = ${entries[1]!.id}`;
    expect((await catalog.findFeatured(48.85, 2.35)).map(p => p.name)).toEqual(["Catalogue proche"]);
    await sql`UPDATE establishments SET featured_radius_km = 300 WHERE name = 'Catalogue hors rayon'`;
    expect((await catalog.findFeatured(48.85, 2.35))[0]?.name).toBe("Catalogue hors rayon");
  });
});
