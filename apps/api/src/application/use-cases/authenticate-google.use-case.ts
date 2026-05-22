import type { GoogleAuthResponse } from "@mates/shared";
import type { GoogleIdentityVerifier } from "../ports/google-identity-verifier.js";
import type { TokenService } from "../ports/token-service.js";
import type { UserRepository } from "../ports/user-repository.js";
import { toAuthResponse } from "./serializers.js";

export type AuthenticateGoogleInput = {
  idToken: string;
};

export class AuthenticateGoogleUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly googleIdentity: GoogleIdentityVerifier,
    private readonly tokenService: TokenService
  ) {}

  async execute(input: AuthenticateGoogleInput): Promise<GoogleAuthResponse> {
    const identity = await this.googleIdentity.verifyIdToken(input.idToken);
    const user = await this.users.findByGoogleSub(identity.subject);

    if (user === null) {
      return { status: "profile_required" };
    }

    return {
      status: "authenticated",
      ...toAuthResponse(user, await this.tokenService.sign({ userId: user.id }))
    };
  }
}
