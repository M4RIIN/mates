import type { AuthResponse } from "@mates/shared";
import { generatePublicTag, type PublicTagSuffixGenerator } from "../../domain/user/public-tag.js";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { PasswordHasher } from "../ports/password-hasher.js";
import type { TokenService } from "../ports/token-service.js";
import type { UserRepository } from "../ports/user-repository.js";

export type RegisterUserInput = {
  pseudo: string;
  password: string;
};

export class RegisterUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly suffixGenerator: PublicTagSuffixGenerator = () => Math.floor(Math.random() * 10_000)
  ) {}

  async execute(input: RegisterUserInput): Promise<AuthResponse> {
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

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.users.create({
      pseudo: input.pseudo,
      publicTag,
      passwordHash
    });

    const token = await this.tokenService.sign({ userId: user.id });

    return {
      token,
      user: {
        id: user.id,
        pseudo: user.pseudo,
        publicTag: user.publicTag,
        createdAt: user.createdAt.toISOString()
      }
    };
  }
}
