import type { PublicUserRecord } from "./user-repository.js";

export type FriendGroupRecord = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: Date;
};

export type FriendGroupDetailsRecord = FriendGroupRecord & {
  members: PublicUserRecord[];
};

export interface FriendGroupRepository {
  create(ownerId: string, name: string, memberUserIds: string[]): Promise<FriendGroupDetailsRecord>;
  replaceMembers(groupId: string, ownerId: string, memberUserIds: string[]): Promise<FriendGroupDetailsRecord | null>;
  listByOwner(ownerId: string): Promise<FriendGroupDetailsRecord[]>;
  findByIdForOwner(groupId: string, ownerId: string): Promise<FriendGroupDetailsRecord | null>;
}
