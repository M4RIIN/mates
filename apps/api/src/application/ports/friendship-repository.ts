import type { PublicUserRecord } from "./user-repository.js";

export type FriendshipStatus = "active" | "blocked";

export type FriendshipRecord = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: Date;
};

export type FriendRecord = PublicUserRecord & {
  friendshipCreatedAt: Date;
};

export interface FriendshipRepository {
  findActiveFriendship(userId: string, friendId: string): Promise<FriendshipRecord | null>;
  addActiveFriendship(requesterId: string, addresseeId: string): Promise<FriendshipRecord>;
  listActiveFriends(userId: string): Promise<FriendRecord[]>;
}
