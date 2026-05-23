import type { InvitationDetailsDto } from "@mates/shared";
import type { InvitationRepository } from "../ports/invitation-repository.js";
import { toInvitationDetailsDto } from "./serializers.js";

export class GetActiveCreatedInvitationUseCase {
  constructor(private readonly invitations: InvitationRepository) {}

  async execute(userId: string, now: Date = new Date()): Promise<InvitationDetailsDto | null> {
    const invitation = await this.invitations.findActiveByCreator(userId, now);
    return invitation === null ? null : toInvitationDetailsDto(invitation);
  }
}
