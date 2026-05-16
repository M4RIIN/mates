import type { PublicUserDto } from "@mates/shared";
import type { UserRepository } from "../ports/user-repository.js";

export class SearchUserByPublicTagUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(publicTag: string): Promise<PublicUserDto | null> {
    const user = await this.users.findByPublicTag(publicTag);
    if (user === null) {
      return null;
    }

    return {
      id: user.id,
      pseudo: user.pseudo,
      publicTag: user.publicTag
    };
  }
}
