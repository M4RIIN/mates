import { and, eq, inArray, or } from "drizzle-orm";
import type {
  FriendRecord,
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

  async addActiveFriendship(requesterId: string, addresseeId: string): Promise<FriendshipRecord> {
    const [created] = await this.db
      .insert(friendships)
      .values({
        requesterId,
        addresseeId,
        status: "active"
      })
      .returning();

    if (created === undefined) {
      throw new Error("Friendship creation failed");
    }

    return toFriendshipRecord(created);
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
