import { describe, expect, it, vi } from "vitest";
import { currentUserSchema } from "@mates/shared";
import { createHttpApp } from "../src/http/app.js";
import type { AppContainer } from "../src/infrastructure/container.js";
import type { UserRecord, UserRepository } from "../src/application/ports/user-repository.js";
import { CompleteOnboardingUseCase } from "../src/application/use-cases/complete-onboarding.use-case.js";
import { GetCurrentUserUseCase } from "../src/application/use-cases/get-current-user.use-case.js";
import { toAuthResponse } from "../src/application/use-cases/serializers.js";

const user: UserRecord = {
  id: "11111111-1111-4111-8111-111111111111", pseudo: "nicolas", publicTag: "nicolas#0047",
  passwordHash: null, googleSub: "google-account", onboardingCompletedAt: null,
  createdAt: new Date("2026-10-02T08:00:00Z")
};

describe("account onboarding", () => {
  it("includes the unseen flag in first login and account responses", async () => {
    const users = { findById: vi.fn(async () => user) } as unknown as UserRepository;
    const me = await new GetCurrentUserUseCase(users).execute(user.id);
    expect(me.onboardingCompletedAt).toBeNull();
    expect(toAuthResponse(user, "token").user.onboardingCompletedAt).toBeNull();
    expect(currentUserSchema.parse(me)).toEqual(me);
  });

  it("returns the persisted completion date on later login", async () => {
    const completedUser = { ...user, onboardingCompletedAt: new Date("2026-10-02T09:00:00Z") };
    const completeOnboarding = vi.fn(async () => completedUser);
    const users = { completeOnboarding } as unknown as UserRepository;
    const completed = await new CompleteOnboardingUseCase(users).execute(user.id);
    expect(completeOnboarding).toHaveBeenCalledWith(user.id);
    expect(completed.onboardingCompletedAt).toBe("2026-10-02T09:00:00.000Z");
    expect(toAuthResponse(completedUser, "token").user.onboardingCompletedAt).toBe(completed.onboardingCompletedAt);
  });

  it("rejects a completion for a deleted account", async () => {
    const users = { completeOnboarding: async () => null } as unknown as UserRepository;
    await expect(new CompleteOnboardingUseCase(users).execute(user.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("requires a session and uses its account ID instead of a supplied ID", async () => {
    const execute = vi.fn(async () => toAuthResponse(user, "token").user);
    const verify = vi.fn(async () => ({ userId: user.id }));
    const app = createHttpApp({
      tokenService: { verify }, useCases: { completeOnboarding: { execute } }
    } as unknown as AppContainer);
    const denied = await app.request("/me/onboarding/complete", { method: "POST" });
    expect(denied.status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
    const accepted = await app.request("/me/onboarding/complete", {
      method: "POST", headers: { authorization: "Bearer session-token", "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "another-account" })
    });
    expect(accepted.status).toBe(200);
    expect(verify).toHaveBeenCalledWith("session-token");
    expect(execute).toHaveBeenCalledWith(user.id);
  });
});
