import { inArray, eq, sql } from "drizzle-orm";
import type { CreateUserInput, PublicUserRecord, UserRecord, UserRepository } from "../../application/ports/user-repository.js";
import type { AppDb } from "../db/client.js";
import { users } from "../db/schema.js";

function toUserRecord(row: typeof users.$inferSelect): UserRecord {
  return {
    id: row.id,
    pseudo: row.pseudo,
    publicTag: row.publicTag,
    passwordHash: row.passwordHash,
    googleSub: row.googleSub,
    appleSub: row.appleSub,
    appleRefreshToken: row.appleRefreshToken,
    onboardingCompletedAt: row.onboardingCompletedAt,
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
    const insert = this.db
      .insert(users)
      .values({
        pseudo: input.pseudo,
        publicTag: input.publicTag,
        passwordHash: input.passwordHash ?? null,
        appleSub: input.appleSub ?? null,
        appleRefreshToken: input.appleRefreshToken ?? null,
        googleSub: input.googleSub ?? null
      });
    const [created] = await (input.appleSub
      ? insert.onConflictDoUpdate({ target: users.appleSub, set: { appleSub: input.appleSub } })
      : insert).returning();

    if (created === undefined) {
      throw new Error("User creation failed");
    }

    return toUserRecord(created);
  }

  async findById(id: string): Promise<UserRecord | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user === undefined ? null : toUserRecord(user);
  }

  async completeOnboarding(id: string): Promise<UserRecord | null> {
    const [user] = await this.db.update(users)
      .set({ onboardingCompletedAt: sql`coalesce(${users.onboardingCompletedAt}, now())` })
      .where(eq(users.id, id)).returning();
    return user === undefined ? null : toUserRecord(user);
  }

  async findByPublicTag(publicTag: string): Promise<UserRecord | null> {
    const [user] = await this.db.select().from(users).where(eq(users.publicTag, publicTag)).limit(1);
    return user === undefined ? null : toUserRecord(user);
  }

  async findByGoogleSub(googleSub: string): Promise<UserRecord | null> {
    const [user] = await this.db.select().from(users).where(eq(users.googleSub, googleSub)).limit(1);
    return user === undefined ? null : toUserRecord(user);
  }

  async findByAppleSub(appleSub: string): Promise<UserRecord | null> {
    const [user] = await this.db.select().from(users).where(eq(users.appleSub, appleSub)).limit(1);
    return user === undefined ? null : toUserRecord(user);
  }

  async updateAppleRefreshToken(id: string, encryptedToken: string): Promise<void> {
    await this.db.update(users).set({ appleRefreshToken: encryptedToken }).where(eq(users.id, id));
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
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
