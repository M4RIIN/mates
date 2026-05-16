import type { FriendDto } from "@mates/shared";
import type { FriendshipRepository } from "../ports/friendship-repository.js";

export class ListFriendsUseCase {
  constructor(private readonly friendships: FriendshipRepository) {}

  async execute(userId: string): Promise<FriendDto[]> {
    const friends = await this.friendships.listActiveFriends(userId);

    return friends.map((friend) => ({
      id: friend.id,
      pseudo: friend.pseudo,
      publicTag: friend.publicTag,
      friendshipCreatedAt: friend.friendshipCreatedAt.toISOString()
    }));
  }
}
