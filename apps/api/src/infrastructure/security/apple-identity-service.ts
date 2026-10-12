import { createHash, randomBytes } from "node:crypto";
import { CompactEncrypt, compactDecrypt, createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import type { AppleAuthRequest } from "@mates/shared";
import type { AppleIdentity, AppleIdentityService } from "../../application/ports/apple-identity-service.js";
import { AppErrors } from "../../domain/shared/app-error.js";
import { logger } from "../logger.js";

const ISSUER = "https://appleid.apple.com";
const appleKeys = createRemoteJWKSet(new URL(`${ISSUER}/auth/keys`));
const identitySchema = z.object({ subject: z.string().min(1), encryptedRefreshToken: z.string().min(1) });
const tokensSchema = z.object({ id_token: z.string().min(1), refresh_token: z.string().min(1) });

export type AppleConfig = { clientId: string; teamId: string; keyId: string; privateKey: string; encryptionSecret: string };

export class NativeAppleIdentityService implements AppleIdentityService {
  private readonly encryptionKey: Uint8Array;
  private readonly signingKey: Uint8Array;

  constructor(
    private readonly config: AppleConfig,
    private readonly fetcher: typeof fetch = fetch,
    private readonly keys: Parameters<typeof jwtVerify>[1] = appleKeys
  ) {
    if (Buffer.byteLength(config.encryptionSecret, "utf8") < 32) {
      throw new Error("APPLE_TOKEN_ENCRYPTION_SECRET must contain at least 32 bytes");
    }
    this.encryptionKey = createHash("sha256").update(`mates:apple:encryption:${config.encryptionSecret}`).digest();
    this.signingKey = createHash("sha256").update(`mates:apple:flow:${config.encryptionSecret}`).digest();
  }

  async createChallenge() {
    const nonce = randomBytes(32).toString("hex");
    const challengeToken = await this.sign({ nonce }, "apple-challenge", "5m");
    return { nonce, challengeToken };
  }

  async authenticate(input: AppleAuthRequest): Promise<AppleIdentity> {
    let stage = "challenge";
    let appleError: string | undefined;
    try {
      const { payload: challenge } = await jwtVerify(input.challengeToken, this.signingKey, {
        algorithms: ["HS256"], issuer: "mates", audience: "apple-challenge", requiredClaims: ["exp", "iat"]
      });
      if (typeof challenge.nonce !== "string") throw new Error("Missing nonce");
      stage = "identity_token";
      const options = { algorithms: ["RS256"], issuer: ISSUER, audience: this.config.clientId, requiredClaims: ["exp", "iat", "sub"] };
      const { payload } = await jwtVerify(input.identityToken, this.keys, options);
      stage = "nonce";
      if (payload.nonce !== challenge.nonce) throw new Error("Invalid nonce");

      // Apple authorization codes are single-use: replaying the same login cannot create a session.
      stage = "client_secret";
      const clientSecret = await this.clientSecret();
      stage = "authorization_code_exchange";
      const response = await this.fetcher(`${ISSUER}/auth/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: this.config.clientId, client_secret: clientSecret,
          grant_type: "authorization_code", code: input.authorizationCode }),
        signal: AbortSignal.timeout(10_000)
      });
      if (!response.ok) {
        // Log only a known OAuth error identifier, never the response body or credentials.
        const failure = z.object({ error: z.enum(["invalid_client", "invalid_grant", "invalid_request",
          "unauthorized_client", "unsupported_grant_type"]) }).safeParse(await response.json().catch(() => null));
        if (failure.success) appleError = failure.data.error;
        throw new Error("Apple rejected the authorization code");
      }
      stage = "token_response";
      const tokens = tokensSchema.parse(await response.json());
      stage = "exchanged_identity_token";
      const { payload: exchanged } = await jwtVerify(tokens.id_token, this.keys, options);
      stage = "identity_binding";
      if (exchanged.sub !== payload.sub || exchanged.nonce !== challenge.nonce) throw new Error("Apple identity mismatch");

      stage = "refresh_token_encryption";
      const encryptedRefreshToken = await new CompactEncrypt(new TextEncoder().encode(tokens.refresh_token))
        .setProtectedHeader({ alg: "dir", enc: "A256GCM" }).encrypt(this.encryptionKey);
      return { subject: payload.sub!, encryptedRefreshToken };
    } catch (error: unknown) {
      const claimError = z.object({ claim: z.enum(["aud", "iss", "exp", "iat", "sub"]) }).safeParse(error);
      logger.warn("auth.apple.failed", {
        stage,
        appleError,
        failedClaim: claimError.success ? claimError.data.claim : undefined,
        errorType: error instanceof Error ? error.name : "UnknownError"
      });
      throw AppErrors.invalidAppleToken();
    }
  }

  createProfileToken(identity: AppleIdentity): Promise<string> {
    return this.sign(identity, "apple-profile", "15m");
  }

  async verifyProfileToken(token: string): Promise<AppleIdentity> {
    try {
      const { payload } = await jwtVerify(token, this.signingKey, {
        algorithms: ["HS256"], issuer: "mates", audience: "apple-profile", requiredClaims: ["exp", "iat"]
      });
      return identitySchema.parse(payload);
    } catch {
      throw AppErrors.invalidAppleToken();
    }
  }

  async revoke(encryptedRefreshToken: string): Promise<void> {
    const { plaintext } = await compactDecrypt(encryptedRefreshToken, this.encryptionKey);
    const response = await this.fetcher(`${ISSUER}/auth/revoke`, {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: this.config.clientId, client_secret: await this.clientSecret(),
        token: new TextDecoder().decode(plaintext), token_type_hint: "refresh_token" }),
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) throw new Error("Apple revocation failed; please retry account deletion");
  }

  private async clientSecret(): Promise<string> {
    const key = await importPKCS8(this.config.privateKey.replace(/\\n/g, "\n"), "ES256");
    return new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: this.config.keyId })
      .setIssuer(this.config.teamId).setSubject(this.config.clientId).setAudience(ISSUER)
      .setIssuedAt().setExpirationTime("5m").sign(key);
  }

  private sign(payload: Record<string, unknown>, audience: string, expiresIn: string): Promise<string> {
    return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuer("mates")
      .setAudience(audience).setIssuedAt().setExpirationTime(expiresIn).sign(this.signingKey);
  }
}
