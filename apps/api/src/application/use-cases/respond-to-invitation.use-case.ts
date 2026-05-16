import type { RespondToInvitationRequest } from "@mates/shared";
import { normalizeInvitationResponse } from "../../domain/invitation/invitation-rules.js";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { InvitationRecipientRecord, InvitationRepository } from "../ports/invitation-repository.js";

export type RespondToInvitationInput = RespondToInvitationRequest & {
  invitationId: string;
  userId: string;
};

export class RespondToInvitationUseCase {
  constructor(private readonly invitations: InvitationRepository) {}

  async execute(input: RespondToInvitationInput): Promise<InvitationRecipientRecord> {
    const recipient = await this.invitations.findRecipient(input.invitationId, input.userId);
    if (recipient === null) {
      throw AppErrors.forbidden("You can only respond to invitations you received");
    }

    const normalized = normalizeInvitationResponse(input.status, input.delayMinutes);

    return this.invitations.updateRecipientResponse({
      recipientId: recipient.id,
      responseStatus: normalized.responseStatus,
      delayMinutes: normalized.delayMinutes,
      respondedAt: normalized.respondedAt
    });
  }
}
