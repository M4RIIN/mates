import type { ReceivedInvitationDto } from "@mates/shared";
import type { InvitationRepository } from "../ports/invitation-repository.js";
import { toReceivedInvitationDto } from "./serializers.js";

export class ListReceivedInvitationsUseCase {
  constructor(private readonly invitations: InvitationRepository) {}

  async execute(userId: string): Promise<ReceivedInvitationDto[]> {
    const invitations = await this.invitations.listReceivedByUser(userId);
    return invitations.map(toReceivedInvitationDto);
  }
}
