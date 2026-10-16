import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { respondToInvitationRequestSchema } from "@mates/shared";
import { migrateDatabase } from "../src/infrastructure/db/migrate.js";
import * as schema from "../src/infrastructure/db/schema.js";
import { PostgresInvitationRepository } from "../src/infrastructure/repositories/postgres-invitation.repository.js";
import { RespondToInvitationUseCase } from "../src/application/use-cases/respond-to-invitation.use-case.js";
import { GetInvitationDetailsUseCase } from "../src/application/use-cases/get-invitation-details.use-case.js";
import { ListReceivedInvitationsUseCase } from "../src/application/use-cases/list-received-invitations.use-case.js";
import { ListCreatedInvitationsUseCase } from "../src/application/use-cases/list-created-invitations.use-case.js";
import { InvitationSharingUseCase } from "../src/application/use-cases/invitation-sharing.use-case.js";
import { PostgresInvitationSharingRepository } from "../src/infrastructure/repositories/postgres-invitation-sharing.repository.js";
import { createHttpApp } from "../src/http/app.js";
import type { AppContainer } from "../src/infrastructure/container.js";
import type { NotificationGateway } from "../src/application/ports/notification-gateway.js";
import type { PushTokenRepository } from "../src/application/ports/push-token-repository.js";
import { invitationNotificationRoute } from "../../mobile/src/domain/invitation/notification-route.js";

describe("advance request contract and notification destination", () => {
  it("requires a positive delay, accepts optional/empty requests, trims and bounds free text", () => {
    const parse = (input: unknown) => respondToInvitationRequestSchema.safeParse(input);
    expect(parse({ status: "yes", delayMinutes: 15, advanceRequest: "  Une bière 🍺  " })).toMatchObject({ success: true, data: { advanceRequest: "Une bière 🍺" } });
    expect(parse({ status: "yes", delayMinutes: 0, advanceRequest: "Une bière" }).success).toBe(false);
    expect(parse({ status: "yes", advanceRequest: "Une bière" }).success).toBe(false);
    expect(parse({ status: "no", advanceRequest: "Une bière" }).success).toBe(false);
    expect(parse({ status: "yes", delayMinutes: 15, advanceRequest: "a".repeat(301) }).success).toBe(false);
    expect(parse({ status: "yes", delayMinutes: 15 }).success).toBe(true);
    expect(parse({ status: "yes", delayMinutes: 0, advanceRequest: "  " }).success).toBe(true);
    expect(parse({ status: "yes", delayMinutes: 15, advanceRequest: null }).success).toBe(true);
  });
  it("opens the organizer's detail while preserving received-invitation destinations", () => {
    const id = randomUUID();
    expect(invitationNotificationRoute("invitation.advance_requested", id)).toEqual({ pathname: "/invitations/created/[id]", params: { id } });
    for (const type of ["invitation.created", "invitation.cancelled"]) expect(invitationNotificationRoute(type, id)?.pathname).toBe("/invitations/received/[id]");
    expect(invitationNotificationRoute("invitation.advance_requested", "bad-id")).toBeNull();
    expect(invitationNotificationRoute("unknown", id)).toBeNull();
  });
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("advance requests on PostgreSQL", () => {
  const databaseName = `mates_advance_test_${randomUUID().replaceAll("-", "")}`;
  const owner = randomUUID(), guest = randomUUID(), other = randomUUID();
  let admin: ReturnType<typeof postgres>, sql: ReturnType<typeof postgres>;
  let repository: PostgresInvitationRepository;
  let respond: RespondToInvitationUseCase;
  let details: GetInvitationDetailsUseCase;
  let received: ListReceivedInvitationsUseCase;
  let sharing: InvitationSharingUseCase;
  let http: ReturnType<typeof createHttpApp>;
  const notify = vi.fn(async () => undefined);
  const tokens = vi.fn(async () => [{ id: randomUUID(), userId: owner, token: "ExpoPushToken[fixture]", platform: "ios", createdAt: new Date() }]);
  const publish = vi.fn(async () => undefined);
  beforeEach(() => vi.clearAllMocks());
  beforeAll(async () => {
    admin = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
    await admin`CREATE DATABASE ${admin(databaseName)}`;
    const url = new URL(process.env.TEST_DATABASE_URL!); url.pathname = `/${databaseName}`;
    await migrateDatabase(url.toString());
    sql = postgres(url.toString(), { max: 8, onnotice: () => undefined });
    const db = drizzle(sql, { schema });
    await db.insert(schema.users).values([
      { id: owner, pseudo: "Alex", publicTag: "Alex#1234", passwordHash: "fixture" },
      { id: guest, pseudo: "Camille", publicTag: "Camille#1234", passwordHash: "fixture" },
      { id: other, pseudo: "Sam", publicTag: "Sam#1234", passwordHash: "fixture" }
    ]);
    repository = new PostgresInvitationRepository(db);
    const realtime = { publishToUser: publish, publishToUsers: publish };
    respond = new RespondToInvitationUseCase(repository, realtime, {
      pushTokens: { listByUserIds: tokens } as unknown as PushTokenRepository,
      notifications: { sendInvitationAdvanceRequest: notify } as unknown as NotificationGateway
    });
    details = new GetInvitationDetailsUseCase(repository);
    received = new ListReceivedInvitationsUseCase(repository);
    sharing = new InvitationSharingUseCase(repository, new PostgresInvitationSharingRepository(db), realtime);
    http = createHttpApp({ tokenService: { verify: async (userId: string) => ({ userId }) }, useCases: { respondToInvitation: respond, getInvitationDetails: details } } as unknown as AppContainer);
  }, 30_000);
  afterAll(async () => {
    await sql?.end();
    if (admin) { await admin`DROP DATABASE IF EXISTS ${admin(databaseName)} WITH (FORCE)`; await admin.end(); }
  });
  async function fixture() {
    const invitation = await repository.create({ creatorId: owner, friendGroupId: null, placeName: "Café", placeAddress: "12 rue des Amis", latitude: null, longitude: null, scheduledAt: new Date(Date.now() + 3600000) });
    await repository.addRecipients(invitation.id, [guest, other]);
    await repository.createAuditEvent({ invitationId: invitation.id, parentAuditEventId: null, actorUserId: owner, eventType: "created", placeName: invitation.placeName, placeAddress: invitation.placeAddress, scheduledAt: invitation.scheduledAt, invitedCount: 2 });
    return invitation;
  }
  function send(id: string, body: unknown, userId: string | null = guest) {
    return http.request(`/invitations/${id}/respond`, { method: "POST", headers: { "Content-Type": "application/json", ...(userId ? { Authorization: `Bearer ${userId}` } : {}) }, body: JSON.stringify(body) });
  }
  const request = { status: "yes" as const, delayMinutes: 15, advanceRequest: "Prends-moi une bière et un plateau." };

  it("saves the request, notifies only the organizer, and keeps it private from other participants and public links", async () => {
    const invitation = await fixture();
    const response = await send(invitation.id, request);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ advanceRequest: request.advanceRequest, delayMinutes: 15 });
    expect(tokens).toHaveBeenCalledWith([owner]);
    expect(notify).toHaveBeenCalledWith(expect.any(Array), { invitationId: invitation.id, participantPseudo: "Camille", delayMinutes: 15, message: request.advanceRequest });
    const forUser = (userId: string) => details.execute({ invitationId: invitation.id, requesterId: userId });
    expect((await forUser(owner)).recipients.find(p => p.user.id === guest)?.advanceRequest).toBe(request.advanceRequest);
    expect((await new ListCreatedInvitationsUseCase(repository).execute(owner)).find(i => i.id === invitation.id)?.recipients.find(p => p.user.id === guest)?.advanceRequest).toBe(request.advanceRequest);
    expect((await forUser(guest)).recipients.find(p => p.user.id === guest)?.advanceRequest).toBe(request.advanceRequest);
    expect(JSON.stringify(await forUser(other))).not.toContain(request.advanceRequest);
    expect((await received.execute(guest)).find(i => i.id === invitation.id)?.myResponse.advanceRequest).toBe(request.advanceRequest);
    expect(JSON.stringify(await received.execute(other))).not.toContain(request.advanceRequest);
    const link = await sharing.enable(invitation.id, owner);
    expect(JSON.stringify(await sharing.getPublic(link.token))).not.toContain(request.advanceRequest);
  });

  it("deduplicates concurrent retries and unchanged requests but notifies for a changed message", async () => {
    const invitation = await fixture();
    await Promise.all(Array.from({ length: 4 }, () => respond.execute({ ...request, invitationId: invitation.id, userId: guest })));
    expect(notify).toHaveBeenCalledTimes(1);
    await respond.execute({ ...request, delayMinutes: 20, invitationId: invitation.id, userId: guest });
    expect(notify).toHaveBeenCalledTimes(1);
    await respond.execute({ ...request, advanceRequest: "Un jus de pomme finalement.", invitationId: invitation.id, userId: guest });
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("preserves requests from older clients and clears them when erased, delay removed or RSVP declined", async () => {
    const invitation = await fixture();
    const execute = (input: Parameters<typeof respond.execute>[0]) => respond.execute(input);
    const base = { invitationId: invitation.id, userId: guest };
    await execute({ ...base, ...request });
    expect((await execute({ ...base, status: "yes", delayMinutes: 20 })).advanceRequest).toBe(request.advanceRequest);
    expect((await execute({ ...base, status: "yes", delayMinutes: 20, advanceRequest: "  " })).advanceRequest).toBeNull();
    await execute({ ...base, ...request });
    expect((await execute({ ...base, status: "yes", delayMinutes: 0 })).advanceRequest).toBeNull();
    await execute({ ...base, ...request });
    expect((await execute({ ...base, status: "no" })).advanceRequest).toBeNull();
  });

  it("rejects unauthorized, invalid, cancelled and expired responses without a notification", async () => {
    const invitation = await fixture();
    expect((await send(invitation.id, request, null)).status).toBe(401);
    expect((await send(invitation.id, request, owner)).status).toBe(403);
    expect((await send(invitation.id, { ...request, delayMinutes: 0 })).status).toBe(400);
    expect((await send(invitation.id, { ...request, advanceRequest: "a".repeat(301) })).status).toBe(400);
    await repository.cancel(invitation.id, new Date());
    expect((await send(invitation.id, request)).status).toBe(409);
    const expired = await fixture();
    await sql`UPDATE invitations SET scheduled_at = now() - interval '3 hours' WHERE id = ${expired.id}`;
    expect((await send(expired.id, request)).status).toBe(409);
    expect(notify).not.toHaveBeenCalled();
  });

  it("enforces the message/delay constraint in storage, including nullable delays", async () => {
    const invitation = await fixture();
    await send(invitation.id, request);
    await expect(sql`UPDATE invitation_recipients SET delay_minutes = NULL WHERE invitation_id = ${invitation.id} AND user_id = ${guest}`).rejects.toMatchObject({ code: "23514" });
  });

  it("keeps the saved request successful if push delivery or realtime transport fails", async () => {
    const invitation = await fixture();
    notify.mockRejectedValueOnce(new Error("Push offline"));
    publish.mockRejectedValueOnce(new Error("Realtime offline"));
    expect((await send(invitation.id, request)).status).toBe(200);
    expect((await repository.findRecipient(invitation.id, guest))?.advanceRequest).toBe(request.advanceRequest);
    expect((await send(invitation.id, request)).status).toBe(200);
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
