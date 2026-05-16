import bcrypt from "bcryptjs";
import type { PasswordHasher } from "../../application/ports/password-hasher.js";

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly saltRounds = 12) {}

  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.saltRounds);
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
