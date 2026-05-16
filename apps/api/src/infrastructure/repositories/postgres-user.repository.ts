import { inArray, eq } from "drizzle-orm";
import type { CreateUserInput, PublicUserRecord, UserRecord, UserRepository } from "../../application/ports/user-repository.js";
import type { AppDb } from "../db/client.js";
import { users } from "../db/schema.js";

function toUserRecord(row: typeof users.$inferSelect): UserRecord {
  return {
    id: row.id,
    pseudo: row.pseudo,
    publicTag: row.publicTag,
    passwordHash: row.passwordHash,
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

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: AppDb) {}

  async create(input: CreateUserInput): Promise<UserRecord> {
    const [created] = await this.db
      .insert(users)
      .values({
        pseudo: input.pseudo,
        publicTag: input.publicTag,
        passwordHash: input.passwordHash
      })
      .returning();

    if (created === undefined) {
      throw new Error("User creation failed");
    }

    return toUserRecord(created);
  }

  async findById(id: string): Promise<UserRecord | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user === undefined ? null : toUserRecord(user);
  }

  async findByPublicTag(publicTag: string): Promise<UserRecord | null> {
    const [user] = await this.db.select().from(users).where(eq(users.publicTag, publicTag)).limit(1);
    return user === undefined ? null : toUserRecord(user);
  }

  async existsByPublicTag(publicTag: string): Promise<boolean> {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.publicTag, publicTag))
      .limit(1);

    return user !== undefined;
  }

  async listByIds(ids: string[]): Promise<PublicUserRecord[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.db.select().from(users).where(inArray(users.id, ids));
    return rows.map(toPublicUserRecord);
  }
}
