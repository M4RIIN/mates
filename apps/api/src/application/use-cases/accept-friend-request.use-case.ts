import type { FriendDto } from "@mates/shared";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { FriendshipRepository } from "../ports/friendship-repository.js";
import type { UserRepository } from "../ports/user-repository.js";

export type AcceptFriendRequestInput = {
  friendshipId: string;
  userId: string;
};

export class AcceptFriendRequestUseCase {
  constructor(
    private readonly friendships: FriendshipRepository,
    private readonly users: UserRepository
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

    return {
      id: friend.id,
      pseudo: friend.pseudo,
      publicTag: friend.publicTag,
      friendshipCreatedAt: friendship.createdAt.toISOString()
    };
  }
}
