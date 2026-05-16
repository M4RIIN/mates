import type { AuthResponse } from "@mates/shared";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { PasswordHasher } from "../ports/password-hasher.js";
import type { TokenService } from "../ports/token-service.js";
import type { UserRepository } from "../ports/user-repository.js";

export type LoginUserInput = {
  identifier: string;
  password: string;
};

export class LoginUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService
  ) {}

  async execute(input: LoginUserInput): Promise<AuthResponse> {
    const user = await this.users.findByPublicTag(input.identifier);
    if (user === null) {
      throw AppErrors.invalidCredentials();
    }

    const isValidPassword = await this.passwordHasher.verify(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw AppErrors.invalidCredentials();
    }

    return {
      token: await this.tokenService.sign({ userId: user.id }),
      user: {
        id: user.id,
        pseudo: user.pseudo,
        publicTag: user.publicTag,
        createdAt: user.createdAt.toISOString()
      }
    };
  }
}
