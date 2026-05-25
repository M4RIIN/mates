import type { FriendRequestDto } from "@mates/shared";
import { assertCanAddFriend } from "../../domain/friend/friendship-rules.js";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { FriendshipRepository } from "../ports/friendship-repository.js";
import type { NotificationGateway } from "../ports/notification-gateway.js";
import type { PushTokenRepository } from "../ports/push-token-repository.js";
import type { RealtimeGateway } from "../ports/realtime-gateway.js";
import type { UserRepository } from "../ports/user-repository.js";

export type AddFriendInput = {
  requesterId: string;
  publicTag: string;
};

export class AddFriendUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly friendships: FriendshipRepository,
    private readonly pushTokens: PushTokenRepository,
    private readonly notifications: NotificationGateway,
    private readonly realtime: RealtimeGateway
  ) {}

  async execute(input: AddFriendInput): Promise<FriendRequestDto> {
    const addressee = await this.users.findByPublicTag(input.publicTag);
    if (addressee === null) {
      throw AppErrors.notFound("User not found");
    }

    assertCanAddFriend(input.requesterId, addressee.id);

    const requester = await this.users.findById(input.requesterId);
    if (requester === null) {
      throw AppErrors.notFound("Requester not found");
    }

    const existingFriendship = await this.friendships.findConnection(input.requesterId, addressee.id);
    if (existingFriendship !== null) {
      if (existingFriendship.status === "active") {
        throw AppErrors.conflict("You are already friends");
      }

      if (existingFriendship.status === "pending") {
        if (existingFriendship.requesterId === input.requesterId) {
          throw AppErrors.conflict("Friend request already sent");
        }

        throw AppErrors.conflict("This user already sent you a friend request");
      }

      throw AppErrors.conflict("Friend request unavailable");
    }

    const friendship = await this.friendships.createPendingFriendRequest(input.requesterId, addressee.id);
    const recipientTokens = await this.pushTokens.listByUserIds([addressee.id]);
    await this.notifications.sendFriendRequestCreated(recipientTokens, {
      friendshipId: friendship.id,
      requesterPseudo: requester.pseudo,
      requesterTag: requester.publicTag
    });
    await this.realtime.publishToUser(addressee.id, {
      type: "friend.request.created",
      friendshipId: friendship.id
    });

    return {
      id: friendship.id,
      requester: {
        id: requester.id,
        pseudo: requester.pseudo,
        publicTag: requester.publicTag
      },
      addressee: {
        id: addressee.id,
        pseudo: addressee.pseudo,
        publicTag: addressee.publicTag
      },
      status: friendship.status,
      createdAt: friendship.createdAt.toISOString()
    };
  }
}
