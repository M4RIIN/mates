import type { RespondToInvitationRequest } from "@mates/shared";
import { normalizeInvitationResponse } from "../../domain/invitation/invitation-rules.js";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { InvitationRecipientRecord, InvitationRepository } from "../ports/invitation-repository.js";
import type { RealtimeGateway } from "../ports/realtime-gateway.js";

export type RespondToInvitationInput = RespondToInvitationRequest & {
  invitationId: string;
  userId: string;
};

export class RespondToInvitationUseCase {
  constructor(
    private readonly invitations: InvitationRepository,
    private readonly realtime: RealtimeGateway
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

    const normalized = normalizeInvitationResponse(input.status, input.delayMinutes);

    const updatedRecipient = await this.invitations.updateRecipientResponse({
      recipientId: recipient.id,
      responseStatus: normalized.responseStatus,
      delayMinutes: normalized.delayMinutes,
      respondedAt: normalized.respondedAt
    });

    await this.realtime.publishToUser(invitation.creatorId, {
      type: "invitation.response.updated",
      invitationId: invitation.id,
      userId: updatedRecipient.userId,
      responseStatus: updatedRecipient.responseStatus
    });

    return updatedRecipient;
  }
}
