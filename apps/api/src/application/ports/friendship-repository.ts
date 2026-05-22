import type { PublicUserRecord } from "./user-repository.js";

export type FriendshipStatus = "pending" | "active" | "blocked";

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

export type FriendRequestRecord = FriendshipRecord & {
  requester: PublicUserRecord;
  addressee: PublicUserRecord;
};

export interface FriendshipRepository {
  findConnection(userId: string, otherUserId: string): Promise<FriendshipRecord | null>;
  findActiveFriendship(userId: string, friendId: string): Promise<FriendshipRecord | null>;
  createPendingFriendRequest(requesterId: string, addresseeId: string): Promise<FriendshipRecord>;
  listReceivedPendingRequests(userId: string): Promise<FriendRequestRecord[]>;
  listSentPendingRequests(userId: string): Promise<FriendRequestRecord[]>;
  acceptFriendRequest(friendshipId: string, addresseeId: string): Promise<FriendshipRecord | null>;
  listActiveFriends(userId: string): Promise<FriendRecord[]>;
}
