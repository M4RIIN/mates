import { describe, expect, it, vi } from "vitest";
import type { AuthResponse } from "@mates/shared";
import { createHttpApp } from "../src/http/app.js";
import type { AppContainer } from "../src/infrastructure/container.js";

const authResponse: AuthResponse = {
  token: "token",
  user: {
    id: "11111111-1111-4111-8111-111111111111",
    pseudo: "nicolas",
    publicTag: "nicolas#0047",
    createdAt: "2026-05-22T08:00:00.000Z"
  }
};

function createContainer(overrides?: Partial<AppContainer>): AppContainer {
  return {
    auth: {
      passwordAuthEnabled: true,
      googleAuthEnabled: true
    },
    tokenService: {
      sign: vi.fn(),
      verify: vi.fn()
    },
    useCases: {
      registerUser: { execute: vi.fn(async () => authResponse) },
      loginUser: { execute: vi.fn(async () => authResponse) },
      authenticateGoogle: { execute: vi.fn() },
      completeGoogleProfile: { execute: vi.fn() },
      getCurrentUser: { execute: vi.fn() },
      addFriend: { execute: vi.fn() },
      acceptFriendRequest: { execute: vi.fn() },
      listFriends: { execute: vi.fn() },
      listReceivedFriendRequests: { execute: vi.fn() },
      listSentFriendRequests: { execute: vi.fn() },
      searchUserByPublicTag: { execute: vi.fn() },
      createInvitation: { execute: vi.fn() },
      sendInvitationToFriends: { execute: vi.fn() },
      cancelInvitation: { execute: vi.fn() },
      respondToInvitation: { execute: vi.fn() },
      getInvitationDetails: { execute: vi.fn() },
      getActiveCreatedInvitation: { execute: vi.fn() },
      listReceivedInvitations: { execute: vi.fn() },
      listCreatedInvitations: { execute: vi.fn() },
      registerPushToken: { execute: vi.fn() },
      searchPlaces: { execute: vi.fn() }
    },
    ...overrides
  } as AppContainer;
}

describe("auth routes", () => {
  it("blocks password registration when password auth is disabled", async () => {
    const app = createHttpApp(
      createContainer({
        auth: {
          passwordAuthEnabled: false,
          googleAuthEnabled: true
        }
      })
    );

    const response = await app.request("/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        pseudo: "nicolas",
        password: "password123"
      })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "FORBIDDEN",
        message: "Password authentication is disabled"
      }
    });
  });

  it("allows password login when password auth is enabled", async () => {
    const container = createContainer();
    const app = createHttpApp(container);

    const response = await app.request("/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        identifier: "nicolas#0047",
        password: "password123"
      })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(authResponse);
    expect(container.useCases.loginUser.execute).toHaveBeenCalledWith({
      identifier: "nicolas#0047",
      password: "password123"
    });
  });
});
