import type { PushPlatform } from "@mates/shared";
import type { PushTokenRepository, PushTokenRecord } from "../ports/push-token-repository.js";

export type RegisterPushTokenInput = {
  userId: string;
  token: string;
  platform: PushPlatform;
};

export class RegisterPushTokenUseCase {
  constructor(private readonly pushTokens: PushTokenRepository) {}

  async execute(input: RegisterPushTokenInput): Promise<PushTokenRecord> {
    return this.pushTokens.upsert(input.userId, input.token, input.platform);
  }
}
