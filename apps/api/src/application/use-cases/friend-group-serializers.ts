import type { FriendGroupDto } from "@mates/shared";
import type { FriendGroupDetailsRecord } from "../ports/friend-group-repository.js";

export function toFriendGroupDto(group: FriendGroupDetailsRecord): FriendGroupDto {
  return {
    id: group.id,
    name: group.name,
    createdAt: group.createdAt.toISOString(),
    members: group.members.map((member) => ({
      id: member.id,
      pseudo: member.pseudo,
      publicTag: member.publicTag
    }))
  };
}
