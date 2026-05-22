import { and, eq, inArray, or } from "drizzle-orm";
import type {
  FriendRecord,
  FriendRequestRecord,
  FriendshipRecord,
  FriendshipRepository
} from "../../application/ports/friendship-repository.js";
import type { AppDb } from "../db/client.js";
import { friendships, users } from "../db/schema.js";

function toFriendshipRecord(row: typeof friendships.$inferSelect): FriendshipRecord {
  return {
    id: row.id,
    requesterId: row.requesterId,
    addresseeId: row.addresseeId,
    status: row.status,
    createdAt: row.createdAt
  };
}

export class PostgresFriendshipRepository implements FriendshipRepository {
  constructor(private readonly db: AppDb) {}

  async findConnection(userId: string, otherUserId: string): Promise<FriendshipRecord | null> {
    const [friendship] = await this.db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, otherUserId)),
          and(eq(friendships.requesterId, otherUserId), eq(friendships.addresseeId, userId))
        )
      )
      .limit(1);

    return friendship === undefined ? null : toFriendshipRecord(friendship);
  }

  async findActiveFriendship(userId: string, friendId: string): Promise<FriendshipRecord | null> {
    const [friendship] = await this.db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "active"),
          or(
            and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, friendId)),
            and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, userId))
          )
        )
      )
      .limit(1);

    return friendship === undefined ? null : toFriendshipRecord(friendship);
  }

  async createPendingFriendRequest(requesterId: string, addresseeId: string): Promise<FriendshipRecord> {
    const [created] = await this.db
      .insert(friendships)
      .values({
        requesterId,
        addresseeId,
        status: "pending"
      })
      .returning();

    if (created === undefined) {
      throw new Error("Friendship creation failed");
    }

    return toFriendshipRecord(created);
  }

  async listReceivedPendingRequests(userId: string): Promise<FriendRequestRecord[]> {
    const rows = await this.db
      .select()
      .from(friendships)
      .where(and(eq(friendships.status, "pending"), eq(friendships.addresseeId, userId)));

    if (rows.length === 0) {
      return [];
    }

    const userIds = [...new Set(rows.flatMap((row) => [row.requesterId, row.addresseeId]))];
    const relatedUsers = await this.db.select().from(users).where(inArray(users.id, userIds));
    const usersById = new Map(
      relatedUsers.map((user) => [
        user.id,
        {
          id: user.id,
          pseudo: user.pseudo,
          publicTag: user.publicTag
        }
      ])
    );

    return rows.map((row) => {
      const requester = usersById.get(row.requesterId);
      const addressee = usersById.get(row.addresseeId);
      if (requester === undefined || addressee === undefined) {
        throw new Error("Friend request lookup failed");
      }

      return {
        ...toFriendshipRecord(row),
        requester,
        addressee
      };
    });
  }

  async acceptFriendRequest(friendshipId: string, addresseeId: string): Promise<FriendshipRecord | null> {
    const [updated] = await this.db
      .update(friendships)
      .set({ status: "active" })
      .where(
        and(
          eq(friendships.id, friendshipId),
          eq(friendships.addresseeId, addresseeId),
          eq(friendships.status, "pending")
        )
      )
      .returning();

    return updated === undefined ? null : toFriendshipRecord(updated);
  }

  async listActiveFriends(userId: string): Promise<FriendRecord[]> {
    const rows = await this.db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "active"),
          or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))
        )
      );

    const friendIds = rows.map((row) => (row.requesterId === userId ? row.addresseeId : row.requesterId));
    if (friendIds.length === 0) {
      return [];
    }

    const friendUsers = await this.db.select().from(users).where(inArray(users.id, friendIds));
    const friendshipByFriendId = new Map(
      rows.map((row) => [row.requesterId === userId ? row.addresseeId : row.requesterId, row])
    );

    return friendUsers.map((friend) => {
      const friendship = friendshipByFriendId.get(friend.id);
      if (friendship === undefined) {
        throw new Error("Friendship lookup failed");
      }

      return {
        id: friend.id,
        pseudo: friend.pseudo,
        publicTag: friend.publicTag,
        friendshipCreatedAt: friendship.createdAt
      };
    });
  }
}
