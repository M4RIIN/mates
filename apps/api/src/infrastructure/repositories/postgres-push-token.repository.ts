import { inArray } from "drizzle-orm";
import type { PushPlatform } from "@mates/shared";
import type { PushTokenRecord, PushTokenRepository } from "../../application/ports/push-token-repository.js";
import type { AppDb } from "../db/client.js";
import { pushTokens } from "../db/schema.js";

function toPushTokenRecord(row: typeof pushTokens.$inferSelect): PushTokenRecord {
  return {
    id: row.id,
    userId: row.userId,
    token: row.token,
    platform: row.platform,
    createdAt: row.createdAt
  };
}

export class PostgresPushTokenRepository implements PushTokenRepository {
  constructor(private readonly db: AppDb) {}

  async upsert(userId: string, token: string, platform: PushPlatform): Promise<PushTokenRecord> {
    const [saved] = await this.db
      .insert(pushTokens)
      .values({
        userId,
        token,
        platform
      })
      .onConflictDoUpdate({
        target: [pushTokens.userId, pushTokens.token],
        set: {
          platform,
          createdAt: new Date()
        }
      })
      .returning();

    if (saved === undefined) {
      throw new Error("Push token upsert failed");
    }

    return toPushTokenRecord(saved);
  }

  async listByUserIds(userIds: string[]): Promise<PushTokenRecord[]> {
    if (userIds.length === 0) {
      return [];
    }

    const rows = await this.db.select().from(pushTokens).where(inArray(pushTokens.userId, userIds));
    return rows.map(toPushTokenRecord);
  }
}
