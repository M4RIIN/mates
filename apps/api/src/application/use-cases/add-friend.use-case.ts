import type { FriendDto } from "@mates/shared";
import { assertCanAddFriend } from "../../domain/friend/friendship-rules.js";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { FriendshipRepository } from "../ports/friendship-repository.js";
import type { UserRepository } from "../ports/user-repository.js";

export type AddFriendInput = {
  requesterId: string;
  publicTag: string;
};

export class AddFriendUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly friendships: FriendshipRepository
  ) {}

  async execute(input: AddFriendInput): Promise<FriendDto> {
    const addressee = await this.users.findByPublicTag(input.publicTag);
    if (addressee === null) {
      throw AppErrors.notFound("User not found");
    }

    assertCanAddFriend(input.requesterId, addressee.id);

    const existingFriendship = await this.friendships.findActiveFriendship(input.requesterId, addressee.id);
    const friendship =
      existingFriendship ?? (await this.friendships.addActiveFriendship(input.requesterId, addressee.id));

    return {
      id: addressee.id,
      pseudo: addressee.pseudo,
      publicTag: addressee.publicTag,
      friendshipCreatedAt: friendship.createdAt.toISOString()
    };
  }
}
