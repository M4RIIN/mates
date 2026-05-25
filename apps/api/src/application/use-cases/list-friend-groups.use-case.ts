import type { FriendGroupDto } from "@mates/shared";
import type { FriendGroupRepository } from "../ports/friend-group-repository.js";
import { toFriendGroupDto } from "./friend-group-serializers.js";

export class ListFriendGroupsUseCase {
  constructor(private readonly friendGroups: FriendGroupRepository) {}

  async execute(ownerId: string): Promise<FriendGroupDto[]> {
    const groups = await this.friendGroups.listByOwner(ownerId);
    return groups.map(toFriendGroupDto);
  }
}
