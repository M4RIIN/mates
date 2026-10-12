import type { AppleAuthRequest, AppleChallengeResponse } from "@mates/shared";

export type AppleIdentity = { subject: string; encryptedRefreshToken: string };

export interface AppleIdentityService {
  createChallenge(): Promise<AppleChallengeResponse>;
  authenticate(input: AppleAuthRequest): Promise<AppleIdentity>;
  createProfileToken(identity: AppleIdentity): Promise<string>;
  verifyProfileToken(token: string): Promise<AppleIdentity>;
  revoke(encryptedRefreshToken: string): Promise<void>;
}
