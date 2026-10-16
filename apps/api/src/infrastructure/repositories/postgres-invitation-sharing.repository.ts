import { and, eq, sql } from "drizzle-orm";
import { isInvitationOpen } from "@mates/shared";
import type { AppDb } from "../db/client.js";
import { invitations, invitationShareLinks as links, invitationGuestResponses as guests } from "../db/schema.js";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { GuestResponseInput, GuestResponseRecord, InvitationSharingRepository } from "../../application/ports/invitation-sharing-repository.js";

function response(row: typeof guests.$inferSelect): GuestResponseRecord {
  return { id: row.id, invitationId: row.invitationId, name: row.name, responseStatus: row.responseStatus as "yes" | "no", respondedAt: row.respondedAt };
}
export class PostgresInvitationSharingRepository implements InvitationSharingRepository {
  constructor(private readonly db: AppDb) {}
  async findLink(invitationId: string) { return (await this.db.select().from(links).where(eq(links.invitationId, invitationId)))[0] ?? null; }
  async findByToken(token: string) { return (await this.db.select().from(links).where(eq(links.token, token)))[0] ?? null; }
  async enable(invitationId: string, token: string, showAddress: boolean) {
    const [link] = await this.db.insert(links).values({ invitationId, token, showAddress }).onConflictDoUpdate({ target: links.invitationId, set: {
      token: sql`CASE WHEN ${links.revokedAt} IS NOT NULL THEN EXCLUDED.token ELSE ${links.token} END`,
      showAddress, revokedAt: null
    } }).returning();
    if (!link) throw new Error("Share link creation failed");
    return link;
  }
  async revoke(invitationId: string) { await this.db.update(links).set({ revokedAt: new Date() }).where(eq(links.invitationId, invitationId)); }
  async findResponse(invitationId: string, guestKeyHash: string) {
    const [row] = await this.db.select().from(guests).where(and(eq(guests.invitationId, invitationId), eq(guests.guestKeyHash, guestKeyHash)));
    return row ? response(row) : null;
  }
  async respond(input: GuestResponseInput) {
    return this.db.transaction(async (transaction) => {
      // Lock invitation and link so cancellation/revocation cannot race a response.
      const [found] = await transaction.select({ invitation: invitations, link: links }).from(links)
        .innerJoin(invitations, eq(links.invitationId, invitations.id)).where(eq(links.token, input.token)).for("update");
      if (!found || found.link.revokedAt) throw AppErrors.notFound("Ce lien n’est plus disponible.");
      if (!isInvitationOpen(found.invitation, new Date())) throw AppErrors.conflict("Cette sortie est annulée ou terminée.");
      const [row] = await transaction.insert(guests).values({ invitationId: found.invitation.id, guestKeyHash: input.guestKeyHash, analyticsBrowserIdHash: input.analyticsBrowserIdHash ?? null, name: input.name, responseStatus: input.status, respondedAt: input.now })
        .onConflictDoUpdate({ target: [guests.invitationId, guests.guestKeyHash], set: { ...(input.analyticsBrowserIdHash !== undefined ? { analyticsBrowserIdHash: input.analyticsBrowserIdHash } : {}), name: input.name, responseStatus: input.status, respondedAt: input.now } }).returning();
      if (!row) throw new Error("Guest response failed");
      return response(row);
    });
  }
}
