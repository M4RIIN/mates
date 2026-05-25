import type { FriendDto } from "@mates/shared";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { FriendshipRepository } from "../ports/friendship-repository.js";
import type { RealtimeGateway } from "../ports/realtime-gateway.js";
import type { UserRepository } from "../ports/user-repository.js";

export type AcceptFriendRequestInput = {
  friendshipId: string;
  userId: string;
};

export class AcceptFriendRequestUseCase {
  constructor(
    private readonly friendships: FriendshipRepository,
    private readonly users: UserRepository,
    private readonly realtime: RealtimeGateway
  ) {}

  async execute(input: AcceptFriendRequestInput): Promise<FriendDto> {
    const friendship = await this.friendships.acceptFriendRequest(input.friendshipId, input.userId);
    if (friendship === null) {
      throw AppErrors.notFound("Friend request not found");
    }

    const friendId = friendship.requesterId === input.userId ? friendship.addresseeId : friendship.requesterId;
    const friend = await this.users.findById(friendId);
    if (friend === null) {
      throw AppErrors.notFound("Friend not found");
    }

    await this.realtime.publishToUsers([friendship.requesterId, friendship.addresseeId], {
      type: "friend.request.accepted",
      friendshipId: friendship.id
    });

    return {
      id: friend.id,
      pseudo: friend.pseudo,
      publicTag: friend.publicTag,
      friendshipCreatedAt: friendship.createdAt.toISOString()
    };
  }
}
