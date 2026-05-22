import type { AuthResponse } from "@mates/shared";
import { AppErrors } from "../../domain/shared/app-error.js";
import { generatePublicTag, type PublicTagSuffixGenerator } from "../../domain/user/public-tag.js";
import type { GoogleIdentityVerifier } from "../ports/google-identity-verifier.js";
import type { TokenService } from "../ports/token-service.js";
import type { UserRepository } from "../ports/user-repository.js";
import { toAuthResponse } from "./serializers.js";

export type CompleteGoogleProfileInput = {
  idToken: string;
  pseudo: string;
};

export class CompleteGoogleProfileUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly googleIdentity: GoogleIdentityVerifier,
    private readonly tokenService: TokenService,
    private readonly suffixGenerator: PublicTagSuffixGenerator = () => Math.floor(Math.random() * 10_000)
  ) {}

  async execute(input: CompleteGoogleProfileInput): Promise<AuthResponse> {
    const identity = await this.googleIdentity.verifyIdToken(input.idToken);
    const existingUser = await this.users.findByGoogleSub(identity.subject);

    if (existingUser !== null) {
      return toAuthResponse(existingUser, await this.tokenService.sign({ userId: existingUser.id }));
    }

    let publicTag: string | null = null;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = generatePublicTag(input.pseudo, this.suffixGenerator);
      const exists = await this.users.existsByPublicTag(candidate);
      if (!exists) {
        publicTag = candidate;
        break;
      }
    }

    if (publicTag === null) {
      throw AppErrors.publicTagGenerationFailed();
    }

    const user = await this.users.create({
      pseudo: input.pseudo,
      publicTag,
      googleSub: identity.subject
    });

    return toAuthResponse(user, await this.tokenService.sign({ userId: user.id }));
  }
}
