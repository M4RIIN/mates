import type { PushPlatform } from "@mates/shared";

export type PushTokenRecord = {
  id: string;
  userId: string;
  token: string;
  platform: PushPlatform;
  createdAt: Date;
};

export interface PushTokenRepository {
  upsert(userId: string, token: string, platform: PushPlatform): Promise<PushTokenRecord>;
  listByUserIds(userIds: string[]): Promise<PushTokenRecord[]>;
}
