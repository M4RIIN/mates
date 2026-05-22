import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import type { GoogleIdentity, GoogleIdentityVerifier } from "../../application/ports/google-identity-verifier.js";
import { AppErrors } from "../../domain/shared/app-error.js";

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const GOOGLE_JWKS_URL = new URL("https://www.googleapis.com/oauth2/v3/certs");

const googleClaimsSchema = z
  .object({
    sub: z.string().min(1),
    email: z.string().email().optional(),
    email_verified: z.boolean().optional(),
    name: z.string().optional(),
    picture: z.string().optional()
  })
  .passthrough();

export class GoogleIdentityTokenVerifier implements GoogleIdentityVerifier {
  private readonly jwks = createRemoteJWKSet(GOOGLE_JWKS_URL);

  constructor(private readonly clientIds: string[]) {
    if (clientIds.length === 0) {
      throw new Error("At least one Google OAuth client ID is required");
    }
  }

  async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: GOOGLE_ISSUERS,
        audience: this.clientIds
      });
      const claims = googleClaimsSchema.parse(payload);

      if (claims.email_verified === false) {
        throw new Error("Google email is not verified");
      }

      return {
        subject: claims.sub,
        email: claims.email ?? null,
        name: claims.name ?? null,
        pictureUrl: claims.picture ?? null
      };
    } catch {
      throw AppErrors.invalidGoogleToken();
    }
  }
}
