import type { UserRepository } from "../ports/user-repository.js";
import type { AppleIdentityService } from "../ports/apple-identity-service.js";
import { AppErrors } from "../../domain/shared/app-error.js";

export class DeleteAccountUseCase {
  constructor(private readonly users: UserRepository, private readonly apple: AppleIdentityService) {}
  async execute(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (user === null) throw AppErrors.notFound("User not found");
    // Keep the local account when revocation fails, allowing the user to retry.
    if (user.appleRefreshToken) await this.apple.revoke(user.appleRefreshToken);
    await this.users.deleteById(userId);
  }
}
