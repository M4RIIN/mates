import type { CurrentUserDto } from "@mates/shared";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { UserRepository } from "../ports/user-repository.js";

export class GetCurrentUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<CurrentUserDto> {
    const user = await this.users.findById(userId);
    if (user === null) {
      throw AppErrors.notFound("User not found");
    }

    return {
      id: user.id,
      pseudo: user.pseudo,
      publicTag: user.publicTag,
      createdAt: user.createdAt.toISOString()
    };
  }
}
