import type { InvitationDetailsDto } from "@mates/shared";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { InvitationRepository } from "../ports/invitation-repository.js";
import { toInvitationDetailsDto } from "./serializers.js";

export type GetInvitationDetailsInput = {
  invitationId: string;
  requesterId: string;
};

export class GetInvitationDetailsUseCase {
  constructor(private readonly invitations: InvitationRepository) {}

  async execute(input: GetInvitationDetailsInput): Promise<InvitationDetailsDto> {
    const details = await this.invitations.getDetails(input.invitationId);
    if (details === null) {
      throw AppErrors.notFound("Invitation not found");
    }

    const isCreator = details.creatorId === input.requesterId;
    const isRecipient = details.recipients.some((recipient) => recipient.user.id === input.requesterId);

    if (!isCreator && !isRecipient) {
      throw AppErrors.notFound("Invitation not found");
    }

    return toInvitationDetailsDto(details);
  }
}
