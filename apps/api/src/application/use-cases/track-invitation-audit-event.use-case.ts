import { AppErrors } from "../../domain/shared/app-error.js";
import { logger } from "../../infrastructure/logger.js";
import type { InvitationAuditAction, InvitationAuditEventRecord, InvitationRepository } from "../ports/invitation-repository.js";

export type TrackInvitationAuditEventInput = {
  invitationId: string;
  userId: string;
  action: InvitationAuditAction;
};

export class TrackInvitationAuditEventUseCase {
  constructor(private readonly invitations: InvitationRepository) {}

  async execute(input: TrackInvitationAuditEventInput): Promise<InvitationAuditEventRecord> {
    const invitation = await this.invitations.getDetails(input.invitationId);
    if (invitation === null) {
      throw AppErrors.notFound("Invitation not found");
    }

    const isCreator = invitation.creatorId === input.userId;
    const isRecipient = invitation.recipients.some((recipient) => recipient.user.id === input.userId);
    if (!isCreator && !isRecipient) {
      throw AppErrors.forbidden("You can only track actions for invitations you are part of");
    }

    const createdAuditEvent = await this.invitations.findCreatedAuditEvent(invitation.id);
    if (createdAuditEvent === null) {
      throw new Error(`Invitation audit root not found for invitation ${invitation.id}`);
    }

    const auditEvent = await this.invitations.createAuditEvent({
      invitationId: invitation.id,
      parentAuditEventId: createdAuditEvent.id,
      actorUserId: input.userId,
      eventType: input.action,
      placeName: invitation.placeName,
      placeAddress: invitation.placeAddress,
      scheduledAt: invitation.scheduledAt,
      invitedCount: invitation.recipients.length
    });

    logger.info("invitation.audit_event.created", {
      invitationId: invitation.id,
      action: input.action,
      actorUserId: input.userId,
      auditEventId: auditEvent.id,
      rootAuditEventId: createdAuditEvent.id,
      placeName: invitation.placeName
    });

    return auditEvent;
  }
}
