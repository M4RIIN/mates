import type { FriendGroupDto } from "@mates/shared";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { FriendGroupRepository } from "../ports/friend-group-repository.js";
import type { FriendshipRepository } from "../ports/friendship-repository.js";
import { toFriendGroupDto } from "./friend-group-serializers.js";

type CreateFriendGroupInput = {
  ownerId: string;
  name: string;
  memberUserIds: string[];
};

export class CreateFriendGroupUseCase {
  constructor(
    private readonly friendGroups: FriendGroupRepository,
    private readonly friendships: FriendshipRepository
  ) {}

  async execute(input: CreateFriendGroupInput): Promise<FriendGroupDto> {
    const friends = await this.friendships.listActiveFriends(input.ownerId);
    const activeFriendIds = new Set(friends.map((friend) => friend.id));
    const memberUserIds = [...new Set(input.memberUserIds)];

    if (memberUserIds.some((memberUserId) => !activeFriendIds.has(memberUserId))) {
      throw AppErrors.validation("Group members must be active friends");
    }

    const group = await this.friendGroups.create(input.ownerId, input.name, memberUserIds);
    return toFriendGroupDto(group);
  }
}
