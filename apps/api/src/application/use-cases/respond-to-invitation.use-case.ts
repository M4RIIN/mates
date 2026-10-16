import { advanceRequestMaxLength, isInvitationOpen, type RespondToInvitationRequest } from "@mates/shared";
import { normalizeInvitationResponse } from "../../domain/invitation/invitation-rules.js";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { InvitationRecipientRecord, InvitationRepository } from "../ports/invitation-repository.js";
import type { RealtimeGateway } from "../ports/realtime-gateway.js";
import { logger } from "../../infrastructure/logger.js";
import type { NotificationGateway } from "../ports/notification-gateway.js";
import type { PushTokenRepository } from "../ports/push-token-repository.js";

export type RespondToInvitationInput = RespondToInvitationRequest & {
  invitationId: string;
  userId: string;
};

export class RespondToInvitationUseCase {
  constructor(
    private readonly invitations: InvitationRepository,
    private readonly realtime: RealtimeGateway,
    private readonly delivery?: { pushTokens: PushTokenRepository; notifications: NotificationGateway }
  ) {}

  async execute(input: RespondToInvitationInput): Promise<InvitationRecipientRecord> {
    const invitation = await this.invitations.getDetails(input.invitationId);
    if (invitation === null) {
      throw AppErrors.notFound("Invitation not found");
    }

    if (invitation.canceledAt !== null) {
      throw AppErrors.invitationCancelled();
    }

    const recipient = await this.invitations.findRecipient(input.invitationId, input.userId);
    if (recipient === null) {
      throw AppErrors.forbidden("You can only respond to invitations you received");
    }

    if (!isInvitationOpen(invitation)) {
      throw AppErrors.conflict("Cette sortie est terminée et ne reçoit plus de réponses.");
    }

    const normalized = normalizeInvitationResponse(input.status, input.delayMinutes);
    const advanceRequest = input.advanceRequest?.trim() || null;
    if (advanceRequest !== null && (advanceRequest.length > advanceRequestMaxLength || normalized.responseStatus !== "yes" || (normalized.delayMinutes ?? 0) <= 0)) {
      throw AppErrors.validation("Ajoute une demande de 300 caractères maximum avec un retard supérieur à zéro.");
    }

    const updatedRecipient = await this.invitations.updateRecipientResponse({
      recipientId: recipient.id,
      responseStatus: normalized.responseStatus,
      delayMinutes: normalized.delayMinutes,
      ...(input.advanceRequest !== undefined ? { advanceRequest } : {}),
      respondedAt: normalized.respondedAt
    });

    if (updatedRecipient.responseStatus === "yes") {
      const createdAuditEvent = await this.invitations.findCreatedAuditEvent(invitation.id);
      if (createdAuditEvent === null) {
        throw new Error(`Invitation audit root not found for invitation ${invitation.id}`);
      }

      const acceptedAuditEvent = await this.invitations.createAuditEvent({
        invitationId: invitation.id,
        parentAuditEventId: createdAuditEvent.id,
        actorUserId: input.userId,
        eventType: "accepted",
        placeName: invitation.placeName,
        placeAddress: invitation.placeAddress,
        scheduledAt: invitation.scheduledAt,
        invitedCount: invitation.recipients.length
      });

      logger.info("invitation.response.accepted", {
        invitationId: invitation.id,
        recipientId: updatedRecipient.id,
        userId: input.userId,
        auditEventId: acceptedAuditEvent.id,
        rootAuditEventId: createdAuditEvent.id,
        delayMinutes: updatedRecipient.delayMinutes
      });
    } else {
      logger.info("invitation.response.rejected", {
        invitationId: invitation.id,
        recipientId: updatedRecipient.id,
        userId: input.userId
      });
    }

    try {
      await this.realtime.publishToUser(invitation.creatorId, {
        type: "invitation.response.updated",
        invitationId: invitation.id,
        userId: updatedRecipient.userId,
        responseStatus: updatedRecipient.responseStatus
      });
    } catch { logger.warn("invitation.response.realtime_failed", { invitationId: invitation.id }); }

    if (updatedRecipient.advanceRequestChanged && updatedRecipient.advanceRequest && this.delivery) {
      const participant = invitation.recipients.find(person => person.user.id === input.userId);
      try {
        const tokens = await this.delivery.pushTokens.listByUserIds([invitation.creatorId]);
        await this.delivery.notifications.sendInvitationAdvanceRequest(tokens, {
          invitationId: invitation.id,
          participantPseudo: participant?.user.pseudo ?? "Un invité",
          delayMinutes: updatedRecipient.delayMinutes ?? 0,
          message: updatedRecipient.advanceRequest
        });
      } catch { logger.warn("invitation.advance_request.notification_failed", { invitationId: invitation.id }); }
    }

    return updatedRecipient;
  }
}
