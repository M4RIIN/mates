import type { InvitationDetailsDto } from "@mates/shared";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { InvitationRepository } from "../ports/invitation-repository.js";
import type { NotificationGateway } from "../ports/notification-gateway.js";
import type { PushTokenRepository } from "../ports/push-token-repository.js";
import type { RealtimeGateway } from "../ports/realtime-gateway.js";
import { toInvitationDetailsDto } from "./serializers.js";

export type CancelInvitationInput = {
  invitationId: string;
  requesterId: string;
  now?: Date;
};

export class CancelInvitationUseCase {
  constructor(
    private readonly invitations: InvitationRepository,
    private readonly pushTokens: PushTokenRepository,
    private readonly notifications: NotificationGateway,
    private readonly realtime: RealtimeGateway
  ) {}

  async execute(input: CancelInvitationInput): Promise<InvitationDetailsDto> {
    const details = await this.invitations.getDetails(input.invitationId);
    if (details === null) {
      throw AppErrors.notFound("Invitation not found");
    }

    if (details.creatorId !== input.requesterId) {
      throw AppErrors.forbidden("You can only cancel invitations you created");
    }

    if (details.canceledAt !== null) {
      return toInvitationDetailsDto(details);
    }

    const now = input.now ?? new Date();
    await this.invitations.cancel(input.invitationId, now);

    const recipientIds = details.recipients.map((recipient) => recipient.user.id);
    if (recipientIds.length > 0) {
      const tokens = await this.pushTokens.listByUserIds(recipientIds);
      await this.notifications.sendInvitationCancelled(tokens, {
        invitationId: details.id,
        creatorPseudo: details.creator.pseudo,
        placeName: details.placeName,
        scheduledAt: details.scheduledAt
      });
    }

    await this.realtime.publishToUsers([details.creatorId, ...recipientIds], {
      type: "invitation.cancelled",
      invitationId: details.id
    });

    const refreshed = await this.invitations.getDetails(input.invitationId);
    if (refreshed === null) {
      throw AppErrors.notFound("Invitation not found");
    }

    return toInvitationDetailsDto(refreshed);
  }
}
