import { asc, eq, inArray } from "drizzle-orm";
import type {
  FriendGroupDetailsRecord,
  FriendGroupRecord,
  FriendGroupRepository
} from "../../application/ports/friend-group-repository.js";
import type { PublicUserRecord } from "../../application/ports/user-repository.js";
import type { AppDb } from "../db/client.js";
import { friendGroupMembers, friendGroups, users } from "../db/schema.js";

function toFriendGroupRecord(row: typeof friendGroups.$inferSelect): FriendGroupRecord {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    createdAt: row.createdAt
  };
}

function toPublicUserRecord(row: typeof users.$inferSelect): PublicUserRecord {
  return {
    id: row.id,
    pseudo: row.pseudo,
    publicTag: row.publicTag
  };
}

export class PostgresFriendGroupRepository implements FriendGroupRepository {
  constructor(private readonly db: AppDb) {}

  async create(ownerId: string, name: string, memberUserIds: string[]): Promise<FriendGroupDetailsRecord> {
    const [group] = await this.db
      .insert(friendGroups)
      .values({
        ownerId,
        name
      })
      .returning();

    if (group === undefined) {
      throw new Error("Friend group creation failed");
    }

    if (memberUserIds.length > 0) {
      await this.db.insert(friendGroupMembers).values(
        memberUserIds.map((userId) => ({
          groupId: group.id,
          userId
        }))
      );
    }

    const details = await this.findByIdForOwner(group.id, ownerId);
    if (details === null) {
      throw new Error("Friend group not found after creation");
    }

    return details;
  }

  async listByOwner(ownerId: string): Promise<FriendGroupDetailsRecord[]> {
    const groups = await this.db.select().from(friendGroups).where(eq(friendGroups.ownerId, ownerId)).orderBy(asc(friendGroups.name));

    const details = await Promise.all(groups.map((group) => this.findByIdForOwner(group.id, ownerId)));
    return details.filter((group): group is FriendGroupDetailsRecord => group !== null);
  }

  async replaceMembers(groupId: string, ownerId: string, memberUserIds: string[]): Promise<FriendGroupDetailsRecord | null> {
    const group = await this.findByIdForOwner(groupId, ownerId);
    if (group === null) {
      return null;
    }

    await this.db.delete(friendGroupMembers).where(eq(friendGroupMembers.groupId, groupId));

    if (memberUserIds.length > 0) {
      await this.db.insert(friendGroupMembers).values(
        memberUserIds.map((userId) => ({
          groupId,
          userId
        }))
      );
    }

    return this.findByIdForOwner(groupId, ownerId);
  }

  async findByIdForOwner(groupId: string, ownerId: string): Promise<FriendGroupDetailsRecord | null> {
    const [group] = await this.db
      .select()
      .from(friendGroups)
      .where(eq(friendGroups.id, groupId))
      .limit(1);

    if (group === undefined || group.ownerId !== ownerId) {
      return null;
    }

    const members = await this.db
      .select()
      .from(friendGroupMembers)
      .where(eq(friendGroupMembers.groupId, groupId));

    const memberUsers =
      members.length === 0
        ? []
        : await this.db.select().from(users).where(inArray(users.id, members.map((member) => member.userId)));
    const usersById = new Map(memberUsers.map((user) => [user.id, toPublicUserRecord(user)]));

    return {
      ...toFriendGroupRecord(group),
      members: members
        .map((member) => usersById.get(member.userId))
        .filter((user): user is PublicUserRecord => user !== undefined)
    };
  }
}
