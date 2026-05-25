import type { CreateInvitationRequest, InvitationDetailsDto } from "@mates/shared";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { FriendGroupRepository } from "../ports/friend-group-repository.js";
import type { FriendshipRepository } from "../ports/friendship-repository.js";
import type { InvitationRepository } from "../ports/invitation-repository.js";
import type { NotificationGateway } from "../ports/notification-gateway.js";
import type { PushTokenRepository } from "../ports/push-token-repository.js";
import type { RealtimeGateway } from "../ports/realtime-gateway.js";
import type { UserRepository } from "../ports/user-repository.js";
import { toInvitationDetailsDto } from "./serializers.js";
import { CreateInvitationUseCase } from "./create-invitation.use-case.js";

export type SendInvitationToFriendsInput = CreateInvitationRequest & {
  creatorId: string;
  now?: Date;
};

export class SendInvitationToFriendsUseCase {
  private readonly createInvitation: CreateInvitationUseCase;

  constructor(
    invitations: InvitationRepository,
    private readonly friendGroups: FriendGroupRepository,
    private readonly friendships: FriendshipRepository,
    private readonly users: UserRepository,
    private readonly pushTokens: PushTokenRepository,
    private readonly notifications: NotificationGateway,
    private readonly realtime: RealtimeGateway
  ) {
    this.createInvitation = new CreateInvitationUseCase(invitations);
    this.invitations = invitations;
  }

  private readonly invitations: InvitationRepository;

  async execute(input: SendInvitationToFriendsInput): Promise<InvitationDetailsDto> {
    const creator = await this.users.findById(input.creatorId);
    if (creator === null) {
      throw AppErrors.notFound("Creator not found");
    }

    const existingInvitation = await this.invitations.findActiveByCreator(input.creatorId, input.now ?? new Date());
    if (existingInvitation !== null) {
      throw AppErrors.invitationAlreadyActive(existingInvitation.id);
    }

    const friends = await this.friendships.listActiveFriends(input.creatorId);
    const activeFriendIds = new Set(friends.map((friend) => friend.id));
    const recipientIds =
      input.friendGroupId === undefined
        ? friends.map((friend) => friend.id)
        : await this.resolveGroupRecipients(input.creatorId, input.friendGroupId, activeFriendIds);

    const invitation = await this.createInvitation.execute(input);

    await this.invitations.addRecipients(invitation.id, recipientIds);

    const details = await this.invitations.getDetails(invitation.id);
    if (details === null) {
      throw AppErrors.notFound("Invitation not found after creation");
    }

    if (recipientIds.length > 0) {
      const tokens = await this.pushTokens.listByUserIds(recipientIds);
      await this.notifications.sendInvitationCreated(tokens, {
        invitationId: invitation.id,
        creatorPseudo: creator.pseudo,
        placeName: invitation.placeName,
        scheduledAt: invitation.scheduledAt
      });
      await this.realtime.publishToUsers(recipientIds, {
        type: "invitation.created",
        invitationId: invitation.id
      });
    }

    return toInvitationDetailsDto(details);
  }

  private async resolveGroupRecipients(
    ownerId: string,
    friendGroupId: string,
    activeFriendIds: Set<string>
  ): Promise<string[]> {
    const group = await this.friendGroups.findByIdForOwner(friendGroupId, ownerId);
    if (group === null) {
      throw AppErrors.notFound("Friend group not found");
    }

    return group.members.map((member) => member.id).filter((memberId) => activeFriendIds.has(memberId));
  }
}
