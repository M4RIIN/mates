import { jwtVerify, SignJWT } from "jose";
import { AppErrors } from "../../domain/shared/app-error.js";
import type { AuthTokenPayload, TokenService } from "../../application/ports/token-service.js";

export class JoseTokenService implements TokenService {
  private readonly secretKey: Uint8Array;

  constructor(
    secret: string,
    private readonly expiresInDays: number
  ) {
    this.secretKey = new TextEncoder().encode(secret);
  }

  async sign(payload: AuthTokenPayload): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.userId)
      .setIssuedAt()
      .setExpirationTime(`${this.expiresInDays}d`)
      .sign(this.secretKey);
  }

  async verify(token: string): Promise<AuthTokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.secretKey);
      if (typeof payload.sub !== "string") {
        throw AppErrors.unauthorized();
      }

      return {
        userId: payload.sub
      };
    } catch {
      throw AppErrors.unauthorized();
    }
  }
}
