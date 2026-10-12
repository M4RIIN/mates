import type { AppleAuthRequest, AppleAuthResponse, CompleteAppleProfileRequest, AuthResponse } from "@mates/shared";
import type { AppleIdentityService } from "../ports/apple-identity-service.js";
import type { TokenService } from "../ports/token-service.js";
import type { UserRepository } from "../ports/user-repository.js";
import { AppErrors } from "../../domain/shared/app-error.js";
import { generatePublicTag, type PublicTagSuffixGenerator } from "../../domain/user/public-tag.js";
import { toAuthResponse } from "./serializers.js";

export class AppleAuthUseCase {
  constructor(private readonly users: UserRepository, private readonly apple: AppleIdentityService,
    private readonly tokens: TokenService,
    private readonly suffix: PublicTagSuffixGenerator = () => Math.floor(Math.random() * 10_000)) {}

  createChallenge() { return this.apple.createChallenge(); }

  async execute(input: AppleAuthRequest): Promise<AppleAuthResponse> {
    const identity = await this.apple.authenticate(input);
    const user = await this.users.findByAppleSub(identity.subject);
    if (user === null) {
      return { status: "profile_required", profileToken: await this.apple.createProfileToken(identity) };
    }
    await this.users.updateAppleRefreshToken(user.id, identity.encryptedRefreshToken);
    return { status: "authenticated", ...toAuthResponse(user, await this.tokens.sign({ userId: user.id })) };
  }

  async completeProfile(input: CompleteAppleProfileRequest): Promise<AuthResponse> {
    const identity = await this.apple.verifyProfileToken(input.profileToken);
    const existing = await this.users.findByAppleSub(identity.subject);
    if (existing !== null) return toAuthResponse(existing, await this.tokens.sign({ userId: existing.id }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const publicTag = generatePublicTag(input.pseudo, this.suffix);
      if (await this.users.existsByPublicTag(publicTag)) continue;
      // Repository upserts on apple_sub, so parallel completions cannot create duplicate accounts.
      const user = await this.users.create({ pseudo: input.pseudo, publicTag, appleSub: identity.subject,
        appleRefreshToken: identity.encryptedRefreshToken });
      return toAuthResponse(user, await this.tokens.sign({ userId: user.id }));
    }
    throw AppErrors.publicTagGenerationFailed();
  }
}
