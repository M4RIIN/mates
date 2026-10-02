import type { CurrentUserDto } from "@mates/shared";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { UserRepository } from "../ports/user-repository.js";
import { toCurrentUserDto } from "./serializers.js";

export class CompleteOnboardingUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<CurrentUserDto> {
    const user = await this.users.completeOnboarding(userId);
    if (user === null) {
      throw AppErrors.notFound("User not found");
    }
    return toCurrentUserDto(user);
  }
}
