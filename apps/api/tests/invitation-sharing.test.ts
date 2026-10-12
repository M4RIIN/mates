import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { createInvitationRequestSchema } from "@mates/shared";
import { migrateDatabase } from "../src/infrastructure/db/migrate.js";
import * as schema from "../src/infrastructure/db/schema.js";
import { PostgresInvitationRepository } from "../src/infrastructure/repositories/postgres-invitation.repository.js";
import { PostgresInvitationSharingRepository } from "../src/infrastructure/repositories/postgres-invitation-sharing.repository.js";
import { InvitationSharingUseCase } from "../src/application/use-cases/invitation-sharing.use-case.js";
import { GetInvitationDetailsUseCase } from "../src/application/use-cases/get-invitation-details.use-case.js";
import { SendInvitationToFriendsUseCase } from "../src/application/use-cases/send-invitation-to-friends.use-case.js";
import { createHttpApp } from "../src/http/app.js";
import type { AppContainer } from "../src/infrastructure/container.js";
import type { UserRepository } from "../src/application/ports/user-repository.js";
import type { FriendshipRepository } from "../src/application/ports/friendship-repository.js";
import type { FriendGroupRepository } from "../src/application/ports/friend-group-repository.js";
import type { PushTokenRepository } from "../src/application/ports/push-token-repository.js";
import type { NotificationGateway } from "../src/application/ports/notification-gateway.js";

it("requires an explicit share-only choice and validates guest privacy controls", () => {
  const base = { placeName: "Café", scheduledAt: new Date().toISOString() };
  expect(createInvitationRequestSchema.safeParse({ ...base, shareOnly: true }).success).toBe(true);
  expect(createInvitationRequestSchema.safeParse({ ...base, shareOnly: true, friendUserIds: [randomUUID()] }).success).toBe(false);
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("invitation sharing on PostgreSQL", () => {
  let admin: ReturnType<typeof postgres>;
  let sql: ReturnType<typeof postgres>;
  const databaseName = `mates_share_test_${randomUUID().replaceAll("-", "")}`;
  let invitations: PostgresInvitationRepository;
  let repository: PostgresInvitationSharingRepository;
  let sharing: InvitationSharingUseCase;
  let http: ReturnType<typeof createHttpApp>;
  const ownerId = randomUUID();
  const otherId = randomUUID();
  const publish = vi.fn(async () => undefined);

  beforeAll(async () => {
    admin = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
    await admin`CREATE DATABASE ${admin(databaseName)}`;
    const url = new URL(process.env.TEST_DATABASE_URL!); url.pathname = `/${databaseName}`;
    await migrateDatabase(url.toString());
    sql = postgres(url.toString(), { max: 5, onnotice: () => undefined });
    const db = drizzle(sql, { schema });
    await db.insert(schema.users).values([
      { id: ownerId, pseudo: "Alex", publicTag: "alex#1234", passwordHash: "fixture" },
      { id: otherId, pseudo: "Sam", publicTag: "sam#1234", passwordHash: "fixture" }
    ]);
    invitations = new PostgresInvitationRepository(db);
    repository = new PostgresInvitationSharingRepository(db);
    sharing = new InvitationSharingUseCase(invitations, repository, { publishToUsers: publish });
    http = createHttpApp({ tokenService: { verify: async () => ownerId }, useCases: { invitationSharing: sharing } } as unknown as AppContainer);
  });
  afterAll(async () => {
    await sql?.end();
    if (admin) { await admin`DROP DATABASE IF EXISTS ${admin(databaseName)} WITH (FORCE)`; await admin.end(); }
  });
  async function fixture() {
    return invitations.create({ creatorId: ownerId, friendGroupId: null, placeName: "Chez Alex", placeAddress: "Adresse privée", latitude: 48.8, longitude: 2.3, scheduledAt: new Date(Date.now() + 3600000) });
  }

  it("only the organizer controls links; public payload excludes address, GPS and participants", async () => {
    const invitation = await fixture();
    await expect(sharing.enable(invitation.id, otherId, false)).rejects.toMatchObject({ httpStatus: 404 });
    const link = await sharing.enable(invitation.id, ownerId, false);
    const response = await http.request(`/shared-invitations/${link.token}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const body = await response.json();
    expect(body).toMatchObject({ creatorPseudo: "Alex", placeName: "Chez Alex", placeAddress: null });
    for (const field of ["latitude", "longitude", "creator", "recipients", "guestResponses"]) expect(body).not.toHaveProperty(field);
    const updated = await sharing.enable(invitation.id, ownerId, true);
    expect(updated.token).toBe(link.token);
    expect((await sharing.getPublic(link.token)).placeAddress).toBe("Adresse privée");
    expect((await http.request(`/invitations/${invitation.id}/share-link`)).status).toBe(401);
  });

  it("concurrent retries update one guest, isolate browser identities and notify the organizer", async () => {
    const invitation = await fixture();
    const link = await sharing.enable(invitation.id, ownerId, false);
    const key = "a".repeat(64);
    await Promise.all(Array.from({ length: 4 }, () => sharing.respond(link.token, { guestKey: key, name: "Camille", status: "yes" })));
    const first = await sharing.getResponse(link.token, key);
    const changed = await sharing.respond(link.token, { guestKey: key, name: "Cam", status: "no" });
    expect(changed.id).toBe(first!.id);
    expect(changed).toMatchObject({ name: "Cam", responseStatus: "no" });
    expect(await sharing.getResponse(link.token, "b".repeat(64))).toBeNull();
    const details = await invitations.getDetails(invitation.id);
    expect(details!.guestResponses).toHaveLength(1);
    expect(details!.guestResponses![0]).not.toHaveProperty("guestKeyHash");
    expect((await sql`SELECT guest_key_hash FROM invitation_guest_responses WHERE invitation_id = ${invitation.id}`)[0]!.guest_key_hash).not.toBe(key);
    expect(publish).toHaveBeenCalledWith([ownerId], { type: "invitation.guests.updated", invitationId: invitation.id });
    await invitations.addRecipients(invitation.id, [otherId]);
    const detailsUseCase = new GetInvitationDetailsUseCase(invitations);
    expect((await detailsUseCase.execute({ invitationId: invitation.id, requesterId: otherId })).guestResponses).toEqual([]);
    expect((await detailsUseCase.execute({ invitationId: invitation.id, requesterId: ownerId })).guestResponses).toHaveLength(1);
  });

  it("revokes old links, rotates new links, preserves answers and blocks cancelled/past responses", async () => {
    const invitation = await fixture();
    const link = await sharing.enable(invitation.id, ownerId, false);
    const answer = { guestKey: "c".repeat(64), name: "Jo", status: "yes" as const };
    await sharing.respond(link.token, answer);
    await sharing.revoke(invitation.id, ownerId);
    await expect(sharing.getPublic(link.token)).rejects.toMatchObject({ httpStatus: 404 });
    await expect(sharing.respond(link.token, answer)).rejects.toMatchObject({ httpStatus: 404 });
    const next = await sharing.enable(invitation.id, ownerId, false);
    expect(next.token).not.toBe(link.token);
    expect(await sharing.getResponse(next.token, answer.guestKey)).toMatchObject({ name: "Jo" });
    await invitations.cancel(invitation.id, new Date());
    expect((await sharing.getPublic(next.token)).closed).toBe(true);
    await expect(sharing.respond(next.token, answer)).rejects.toMatchObject({ httpStatus: 409 });
    const past = await fixture();
    const pastLink = await sharing.enable(past.id, ownerId, false);
    await sql`UPDATE invitations SET scheduled_at = now() - interval '1 minute' WHERE id = ${past.id}`;
    expect((await sharing.getPublic(pastLink.token)).closed).toBe(false);
    await expect(sharing.respond(pastLink.token, answer)).resolves.toMatchObject({ responseStatus: "yes" });
    await sql`UPDATE invitations SET scheduled_at = now() - interval '2 hours' WHERE id = ${past.id}`;
    expect((await sharing.getPublic(pastLink.token)).closed).toBe(true);
    await expect(sharing.respond(pastLink.token, answer)).rejects.toMatchObject({ httpStatus: 409 });
  });

  it("keeps an invitation active across midnight and releases it exactly two hours after its start", async () => {
    const overnight = await invitations.create({ creatorId: otherId, friendGroupId: null, placeName: "Sortie tardive", placeAddress: null, latitude: null, longitude: null, scheduledAt: new Date("2026-10-10T23:30:00Z") });
    expect((await invitations.findActiveByCreator(otherId, new Date("2026-10-11T00:05:00Z")))?.id).toBe(overnight.id);
    expect(await invitations.findActiveByCreator(otherId, new Date("2026-10-11T01:30:00Z"))).toBeNull();
  });

  it("validates anonymous input without requiring authentication", async () => {
    const invitation = await fixture();
    const link = await sharing.enable(invitation.id, ownerId, false);
    const send = (body: unknown) => http.request(`/shared-invitations/${link.token}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect((await send({ guestKey: "d".repeat(64), name: " A ", status: "yes" })).status).toBe(400);
    expect((await send({ guestKey: "d".repeat(64), name: " Camille ", status: "yes" })).status).toBe(200);
    expect((await http.request("/shared-invitations/invalid")).status).toBe(400);
    const redirect = await http.request(`/s/${link.token}`);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toBe(`/app/s/${link.token}`);
  });

  it("creates a share-only sortie without sending invitations to existing friends", async () => {
    // Reuse a distinct organizer so the existing active-sortie rule remains enforced.
    const findById = vi.fn(async () => ({ id: otherId, pseudo: "Sam" }));
    const notify = vi.fn();
    const send = new SendInvitationToFriendsUseCase(invitations, {} as FriendGroupRepository,
      { listActiveFriends: async () => [{ id: ownerId }] } as unknown as FriendshipRepository,
      { findById } as unknown as UserRepository, {} as PushTokenRepository,
      { sendInvitationCreated: notify } as unknown as NotificationGateway, { publishToUsers: publish });
    const details = await send.execute({ creatorId: otherId, placeName: "Café", scheduledAt: new Date(Date.now() + 600000).toISOString(), shareOnly: true });
    expect(details.recipients).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });
});
