import { logger } from "../../infrastructure/logger.js";
import { createHash, randomBytes } from "node:crypto";
import { isInvitationOpen, type GuestRespondRequest, type SharedInvitationDto } from "@mates/shared";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { InvitationRepository } from "../ports/invitation-repository.js";
import type { InvitationSharingRepository, GuestResponseRecord } from "../ports/invitation-sharing-repository.js";
import type { RealtimeGateway } from "../ports/realtime-gateway.js";

export function toGuestResponseDto(row: GuestResponseRecord) {
  return { id: row.id, name: row.name, responseStatus: row.responseStatus, respondedAt: row.respondedAt.toISOString() };
}

export class InvitationSharingUseCase {
  constructor(private readonly invitations: InvitationRepository, private readonly sharing: InvitationSharingRepository, private readonly realtime: RealtimeGateway) {}

  private async owner(invitationId: string, userId: string) {
    const invitation = await this.invitations.getDetails(invitationId);
    if (invitation === null || invitation.creatorId !== userId) throw AppErrors.notFound();
    return invitation;
  }

  async getLink(invitationId: string, userId: string) {
    await this.owner(invitationId, userId);
    const link = await this.sharing.findLink(invitationId);
    return link === null || link.revokedAt !== null ? null : { token: link.token, showAddress: link.showAddress };
  }

  async enable(invitationId: string, userId: string, showAddress: boolean) {
    const invitation = await this.owner(invitationId, userId);
    if (!isInvitationOpen(invitation)) throw AppErrors.conflict("Cette sortie ne reçoit plus de réponses.");
    const link = await this.sharing.enable(invitationId, randomBytes(32).toString("hex"), showAddress);
    logger.info("invitation.share.enabled", { invitationId, showAddress });
    return { token: link.token, showAddress: link.showAddress };
  }

  async revoke(invitationId: string, userId: string) {
    await this.owner(invitationId, userId);
    await this.sharing.revoke(invitationId);
    logger.info("invitation.share.revoked", { invitationId });
  }

  private async activeLink(token: string) {
    const link = await this.sharing.findByToken(token);
    if (link === null || link.revokedAt !== null) throw AppErrors.notFound("Ce lien est introuvable ou a été désactivé.");
    return link;
  }

  async getPublic(token: string): Promise<SharedInvitationDto> {
    const link = await this.activeLink(token);
    const invitation = await this.invitations.getDetails(link.invitationId);
    if (invitation === null) throw AppErrors.notFound();
    return {
      id: invitation.id, placeName: invitation.placeName,
      placeAddress: link.showAddress ? invitation.placeAddress : null,
      scheduledAt: invitation.scheduledAt.toISOString(), canceledAt: invitation.canceledAt?.toISOString() ?? null,
      creatorPseudo: invitation.creator.pseudo, showAddress: link.showAddress,
      closed: !isInvitationOpen(invitation)
    };
  }

  async getResponse(token: string, guestKey: string) {
    const link = await this.activeLink(token);
    const response = await this.sharing.findResponse(link.invitationId, createHash("sha256").update(guestKey).digest("hex"));
    return response === null ? null : toGuestResponseDto(response);
  }

  async respond(token: string, input: GuestRespondRequest) {
    const response = await this.sharing.respond({ token, guestKeyHash: createHash("sha256").update(input.guestKey).digest("hex"), name: input.name, status: input.status, now: new Date() });
    const invitation = await this.invitations.getDetails(response.invitationId);
    if (invitation !== null) await this.realtime.publishToUsers([invitation.creatorId], { type: "invitation.guests.updated", invitationId: invitation.id });
    logger.info("invitation.guest_response.saved", { invitationId: response.invitationId, responseStatus: response.responseStatus });
    return toGuestResponseDto(response);
  }
}
