import type { CreateInvitationRequest } from "@mates/shared";
import { assertInvitationScheduledToday } from "../../domain/invitation/invitation-rules.js";
import type { InvitationRecord, InvitationRepository } from "../ports/invitation-repository.js";

export type CreateInvitationInput = CreateInvitationRequest & {
  creatorId: string;
  now?: Date;
};

export class CreateInvitationUseCase {
  constructor(private readonly invitations: InvitationRepository) {}

  async execute(input: CreateInvitationInput): Promise<InvitationRecord> {
    const scheduledAt = new Date(input.scheduledAt);
    assertInvitationScheduledToday(scheduledAt, input.now ?? new Date());

    return this.invitations.create({
      creatorId: input.creatorId,
      friendGroupId: input.friendGroupId ?? null,
      placeName: input.placeName,
      placeAddress: input.placeAddress ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      scheduledAt
    });
  }
}
