import type { InvitationDetailsDto } from "@mates/shared";
import type { InvitationRepository } from "../ports/invitation-repository.js";
import { toInvitationDetailsDto } from "./serializers.js";

export class ListCreatedInvitationsUseCase {
  constructor(private readonly invitations: InvitationRepository) {}

  async execute(userId: string): Promise<InvitationDetailsDto[]> {
    const invitations = await this.invitations.listCreatedByUser(userId);
    return invitations.map(toInvitationDetailsDto);
  }
}
