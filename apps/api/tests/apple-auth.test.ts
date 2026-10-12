import { describe, expect, it, vi } from "vitest";
import type { UserRecord, UserRepository } from "../src/application/ports/user-repository.js";
import type { AppleIdentityService } from "../src/application/ports/apple-identity-service.js";
import { AppleAuthUseCase } from "../src/application/use-cases/apple-auth.use-case.js";
import { DeleteAccountUseCase } from "../src/application/use-cases/delete-account.use-case.js";
import { createHttpApp } from "../src/http/app.js";
import type { AppContainer } from "../src/infrastructure/container.js";

const user: UserRecord = {
  id: "11111111-1111-4111-8111-111111111111", pseudo: "nicolas", publicTag: "nicolas#0047",
  passwordHash: null, googleSub: null, appleSub: "apple-user", appleRefreshToken: "encrypted-refresh",
  onboardingCompletedAt: null, createdAt: new Date("2026-10-12T12:00:00Z")
};
function setup() {
  const users: UserRepository = {
    create: vi.fn(async (input) => ({ ...user, ...input })),
    findById: vi.fn(async () => user), findByPublicTag: vi.fn(async () => null),
    findByGoogleSub: vi.fn(async () => null), findByAppleSub: vi.fn(async () => null),
    updateAppleRefreshToken: vi.fn(async () => {}), deleteById: vi.fn(async () => {}),
    completeOnboarding: vi.fn(async () => user), existsByPublicTag: vi.fn(async () => false), listByIds: vi.fn(async () => [])
  };
  const apple: AppleIdentityService = {
    createChallenge: vi.fn(async () => ({ nonce: "nonce", challengeToken: "challenge" })),
    authenticate: vi.fn(async () => ({ subject: "apple-user", encryptedRefreshToken: "encrypted-refresh" })),
    createProfileToken: vi.fn(async () => "profile-token"),
    verifyProfileToken: vi.fn(async () => ({ subject: "apple-user", encryptedRefreshToken: "encrypted-refresh" })),
    revoke: vi.fn(async () => {})
  };
  const tokens = { sign: vi.fn(async () => "session-token"), verify: vi.fn(async () => ({ userId: user.id })) };
  return { users, apple, tokens, auth: new AppleAuthUseCase(users, apple, tokens, () => 47) };
}
const input = { identityToken: "id-token", authorizationCode: "code", challengeToken: "challenge" };

describe("Apple account flow", () => {
  it("asks only for a pseudo for a new account, without storing name or email", async () => {
    const { auth, users } = setup();
    await expect(auth.execute(input)).resolves.toEqual({ status: "profile_required", profileToken: "profile-token" });
    await expect(auth.completeProfile({ profileToken: "profile-token", pseudo: "nicolas" })).resolves.toMatchObject({
      token: "session-token", user: { pseudo: "nicolas", publicTag: "nicolas#0047" }
    });
    expect(users.create).toHaveBeenCalledWith({ pseudo: "nicolas", publicTag: "nicolas#0047", appleSub: "apple-user", appleRefreshToken: "encrypted-refresh" });
    expect(users.findByGoogleSub).not.toHaveBeenCalled();
  });

  it("logs in by Apple subject and updates the encrypted revocation token", async () => {
    const { auth, users } = setup();
    vi.mocked(users.findByAppleSub).mockResolvedValue(user);
    await expect(auth.execute(input)).resolves.toMatchObject({ status: "authenticated", token: "session-token", user: { id: user.id } });
    expect(users.updateAppleRefreshToken).toHaveBeenCalledWith(user.id, "encrypted-refresh");
    expect(users.create).not.toHaveBeenCalled();
  });

  it("returns the existing profile when onboarding is submitted twice", async () => {
    const { auth, users } = setup();
    vi.mocked(users.findByAppleSub).mockResolvedValue(user);
    await expect(auth.completeProfile({ profileToken: "profile-token", pseudo: "different" })).resolves.toMatchObject({ user: { pseudo: "nicolas" } });
    expect(users.create).not.toHaveBeenCalled();
  });

  it("does not create sessions after identity verification fails", async () => {
    const { auth, apple, users, tokens } = setup();
    vi.mocked(apple.authenticate).mockRejectedValue(new Error("Invalid identity"));
    await expect(auth.execute(input)).rejects.toThrow("Invalid identity");
    expect(users.findByAppleSub).not.toHaveBeenCalled();
    expect(tokens.sign).not.toHaveBeenCalled();
  });

  it("revokes Apple access before deleting the local account", async () => {
    const { users, apple } = setup();
    await new DeleteAccountUseCase(users, apple).execute(user.id);
    expect(apple.revoke).toHaveBeenCalledWith("encrypted-refresh");
    expect(users.deleteById).toHaveBeenCalledWith(user.id);
    expect(vi.mocked(apple.revoke).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(users.deleteById).mock.invocationCallOrder[0]!);
  });

  it("keeps the account when Apple revocation fails so deletion can be retried", async () => {
    const { users, apple } = setup();
    vi.mocked(apple.revoke).mockRejectedValue(new Error("Apple unavailable"));
    await expect(new DeleteAccountUseCase(users, apple).execute(user.id)).rejects.toThrow("Apple unavailable");
    expect(users.deleteById).not.toHaveBeenCalled();
  });

  it("deletes password/Google accounts without an Apple call", async () => {
    const { users, apple } = setup();
    vi.mocked(users.findById).mockResolvedValue({ ...user, appleSub: null, appleRefreshToken: null });
    await new DeleteAccountUseCase(users, apple).execute(user.id);
    expect(apple.revoke).not.toHaveBeenCalled();
    expect(users.deleteById).toHaveBeenCalledWith(user.id);
  });
});

describe("Apple HTTP routes", () => {
  function app(enabled = true) {
    const { auth, tokens, users, apple } = setup();
    return createHttpApp({ auth: { passwordAuthEnabled: true, googleAuthEnabled: true, appleAuthEnabled: enabled },
      tokenService: tokens, useCases: { appleAuth: auth, deleteAccount: new DeleteAccountUseCase(users, apple) }
    } as unknown as AppContainer);
  }
  const request = (body: unknown) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  it("returns a challenge and a profile token without exposing the refresh token", async () => {
    const api = app();
    const challenge = await api.request("/auth/apple/challenge", { method: "POST" });
    expect(challenge.status).toBe(200);
    expect(challenge.headers.get("cache-control")).toBe("no-store");
    const login = await api.request("/auth/apple", request(input));
    expect(login.status).toBe(200);
    await expect(login.json()).resolves.toEqual({ status: "profile_required", profileToken: "profile-token" });
    const complete = await api.request("/auth/apple/complete-profile", request({ profileToken: "profile-token", pseudo: "nicolas" }));
    expect(complete.status).toBe(201);
  });
  it("rejects missing tokens and invalid pseudos", async () => {
    const api = app();
    expect((await api.request("/auth/apple", request({}))).status).toBe(400);
    expect((await api.request("/auth/apple/complete-profile", request({ profileToken: "token", pseudo: "bad pseudo" }))).status).toBe(400);
  });
  it("blocks all Apple endpoints when disabled", async () => {
    const api = app(false);
    for (const path of ["/auth/apple", "/auth/apple/challenge", "/auth/apple/complete-profile"]) {
      expect((await api.request(path, request(input))).status).toBe(403);
    }
  });
  it("requires a session to delete an account", async () => {
    expect((await app().request("/me/delete", { method: "POST" })).status).toBe(401);
  });
});
