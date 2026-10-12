import { beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import { exportPKCS8, generateKeyPair, jwtVerify, SignJWT } from "jose";
import { NativeAppleIdentityService, type AppleConfig } from "../src/infrastructure/security/apple-identity-service.js";
import { JoseTokenService } from "../src/infrastructure/security/jose-token-service.js";

let config: AppleConfig;
let appleKey: Awaited<ReturnType<typeof generateKeyPair>>;
beforeAll(async () => {
  const developerKey = await generateKeyPair("ES256");
  appleKey = await generateKeyPair("RS256");
  config = { clientId: "com.lagrange.mates", teamId: "TEAM", keyId: "KEY", privateKey: await exportPKCS8(developerKey.privateKey), encryptionSecret: "test-secret-at-least-thirty-two-bytes" };
});
afterEach(() => vi.useRealTimers());

async function token(nonce: string, overrides: { audience?: string; issuer?: string; subject?: string; expiration?: string } = {}) {
  return new SignJWT({ nonce }).setProtectedHeader({ alg: "RS256" })
    .setSubject(overrides.subject ?? "apple-user").setIssuer(overrides.issuer ?? "https://appleid.apple.com")
    .setAudience(overrides.audience ?? config.clientId).setIssuedAt()
    .setExpirationTime(overrides.expiration ?? "5m").sign(appleKey.privateKey);
}

function setup() {
  const fetcher = vi.fn<typeof fetch>();
  const service = new NativeAppleIdentityService(config, fetcher, appleKey.publicKey);
  return { service, fetcher };
}

describe("Apple identity verification", () => {
  it("logs the exchange failure without logging tokens, secrets or Apple's description", async () => {
    const { service, fetcher } = setup();
    const challenge = await service.createChallenge();
    const identityToken = await token(challenge.nonce);
    fetcher.mockResolvedValueOnce(Response.json({ error: "invalid_client", error_description: "private-response-detail" }, { status: 400 }));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(service.authenticate({ ...challenge, identityToken, authorizationCode: "private-code" }))
        .rejects.toMatchObject({ code: "INVALID_APPLE_TOKEN" });
      const log = warning.mock.calls.map((call) => call.join(" ")).join("\n");
      expect(log).toContain('"stage":"authorization_code_exchange"');
      expect(log).toContain('"appleError":"invalid_client"');
      for (const secret of [identityToken, challenge.challengeToken, config.privateKey, "private-code", "private-response-detail"]) {
        expect(log).not.toContain(secret);
      }
    } finally { warning.mockRestore(); }
  });

  it("exchanges the code, encrypts the refresh token and revokes it server-side", async () => {
    const { service, fetcher } = setup();
    const challenge = await service.createChallenge();
    const identityToken = await token(challenge.nonce);
    fetcher.mockResolvedValueOnce(Response.json({ id_token: identityToken, refresh_token: "private-apple-refresh" }));
    const identity = await service.authenticate({ ...challenge, identityToken, authorizationCode: "single-use-code" });
    expect(identity.subject).toBe("apple-user");
    expect(identity.encryptedRefreshToken).not.toContain("private-apple-refresh");
    const params = fetcher.mock.calls[0]![1]!.body as URLSearchParams;
    expect(params.get("client_id")).toBe(config.clientId);
    expect(params.get("code")).toBe("single-use-code");
    const profileToken = await service.createProfileToken(identity);
    await expect(service.verifyProfileToken(profileToken)).resolves.toEqual(identity);
    // Onboarding credentials must never be accepted as normal app sessions.
    await expect(new JoseTokenService(config.encryptionSecret, 30).verify(profileToken)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    fetcher.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await service.revoke(identity.encryptedRefreshToken);
    const revokeParams = fetcher.mock.calls[1]![1]!.body as URLSearchParams;
    expect(revokeParams.get("token")).toBe("private-apple-refresh");
    expect(fetcher.mock.calls[1]![0]).toBe("https://appleid.apple.com/auth/revoke");
  });

  it.each([
    { audience: "different-app" }, { issuer: "https://attacker.example" }, { expiration: "-1s" }
  ])("rejects invalid Apple claims before contacting the token endpoint: %j", async (overrides) => {
    const { service, fetcher } = setup();
    const challenge = await service.createChallenge();
    await expect(service.authenticate({ ...challenge, identityToken: await token(challenge.nonce, overrides), authorizationCode: "code" }))
      .rejects.toMatchObject({ code: "INVALID_APPLE_TOKEN" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects a different nonce and a token signed by another key", async () => {
    const { service, fetcher } = setup();
    const challenge = await service.createChallenge();
    await expect(service.authenticate({ ...challenge, identityToken: await token("wrong-nonce"), authorizationCode: "code" }))
      .rejects.toMatchObject({ code: "INVALID_APPLE_TOKEN" });
    const attacker = await generateKeyPair("RS256");
    const forged = await new SignJWT({ nonce: challenge.nonce }).setProtectedHeader({ alg: "RS256" })
      .setSubject("apple-user").setIssuer("https://appleid.apple.com").setAudience(config.clientId)
      .setIssuedAt().setExpirationTime("5m").sign(attacker.privateKey);
    await expect(service.authenticate({ ...challenge, identityToken: forged, authorizationCode: "code" }))
      .rejects.toMatchObject({ code: "INVALID_APPLE_TOKEN" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects an authorization-code replay or a code for a different identity", async () => {
    const { service, fetcher } = setup();
    const challenge = await service.createChallenge();
    const input = { ...challenge, identityToken: await token(challenge.nonce), authorizationCode: "code" };
    fetcher.mockResolvedValueOnce(Response.json({ error: "invalid_grant" }, { status: 400 }));
    await expect(service.authenticate(input)).rejects.toMatchObject({ code: "INVALID_APPLE_TOKEN" });
    fetcher.mockResolvedValueOnce(Response.json({ id_token: await token(challenge.nonce, { subject: "other-user" }), refresh_token: "refresh" }));
    await expect(service.authenticate(input)).rejects.toMatchObject({ code: "INVALID_APPLE_TOKEN" });
  });

  it("expires challenges and profile tokens and separates their purposes", async () => {
    const { service, fetcher } = setup();
    const challenge = await service.createChallenge();
    await expect(service.verifyProfileToken(challenge.challengeToken)).rejects.toMatchObject({ code: "INVALID_APPLE_TOKEN" });
    const profile = await service.createProfileToken({ subject: "apple-user", encryptedRefreshToken: "encrypted" });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 16 * 60_000));
    await expect(service.verifyProfileToken(profile)).rejects.toMatchObject({ code: "INVALID_APPLE_TOKEN" });
    await expect(service.authenticate({ ...challenge, identityToken: "unused", authorizationCode: "unused" }))
      .rejects.toMatchObject({ code: "INVALID_APPLE_TOKEN" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("signs the developer secret with the configured team, key and app", async () => {
    const { service, fetcher } = setup();
    const challenge = await service.createChallenge();
    const identityToken = await token(challenge.nonce);
    fetcher.mockResolvedValueOnce(Response.json({ id_token: identityToken, refresh_token: "refresh" }));
    await service.authenticate({ ...challenge, identityToken, authorizationCode: "code" });
    const params = fetcher.mock.calls[0]![1]!.body as URLSearchParams;
    const { importPKCS8 } = await import("jose");
    const { payload, protectedHeader } = await jwtVerify(params.get("client_secret")!, await importPKCS8(config.privateKey, "ES256"));
    expect(payload).toMatchObject({ iss: "TEAM", sub: config.clientId, aud: "https://appleid.apple.com" });
    expect(protectedHeader).toMatchObject({ alg: "ES256", kid: "KEY" });
  });
});
