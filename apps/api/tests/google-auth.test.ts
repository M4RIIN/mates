import { describe, expect, it } from "vitest";
import type { GoogleIdentityVerifier } from "../src/application/ports/google-identity-verifier.js";
import type { AuthTokenPayload, TokenService } from "../src/application/ports/token-service.js";
import type { CreateUserInput, PublicUserRecord, UserRecord, UserRepository } from "../src/application/ports/user-repository.js";
import { AuthenticateGoogleUseCase } from "../src/application/use-cases/authenticate-google.use-case.js";
import { CompleteGoogleProfileUseCase } from "../src/application/use-cases/complete-google-profile.use-case.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const GOOGLE_SUB = "google-user-123";

const googleIdentity: GoogleIdentityVerifier = {
  verifyIdToken: async () => ({
    subject: GOOGLE_SUB,
    email: "nicolas@example.com",
    name: "Nicolas",
    pictureUrl: null
  })
};

const tokenService: TokenService = {
  sign: async () => "app-token",
  verify: async (): Promise<AuthTokenPayload> => ({ userId: USER_ID })
};

function createUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    create: async (input: CreateUserInput): Promise<UserRecord> => ({
      id: USER_ID,
      pseudo: input.pseudo,
      publicTag: input.publicTag,
      passwordHash: input.passwordHash ?? null,
      googleSub: input.googleSub ?? null,
      createdAt: new Date("2026-05-22T08:00:00.000Z")
    }),
    findById: async (): Promise<UserRecord | null> => null,
    findByPublicTag: async (): Promise<UserRecord | null> => null,
    findByGoogleSub: async (): Promise<UserRecord | null> => null,
    existsByPublicTag: async (): Promise<boolean> => false,
    listByIds: async (): Promise<PublicUserRecord[]> => [],
    ...overrides
  };
}

describe("Google auth flow", () => {
  it("asks for a profile when the Google account is new", async () => {
    const useCase = new AuthenticateGoogleUseCase(createUserRepository(), googleIdentity, tokenService);

    await expect(useCase.execute({ idToken: "google-id-token" })).resolves.toEqual({
      status: "profile_required"
    });
  });

  it("authenticates an existing Google user", async () => {
    const user: UserRecord = {
      id: USER_ID,
      pseudo: "nicolas",
      publicTag: "nicolas#0047",
      passwordHash: null,
      googleSub: GOOGLE_SUB,
      createdAt: new Date("2026-05-22T08:00:00.000Z")
    };
    const useCase = new AuthenticateGoogleUseCase(
      createUserRepository({
        findByGoogleSub: async () => user
      }),
      googleIdentity,
      tokenService
    );

    await expect(useCase.execute({ idToken: "google-id-token" })).resolves.toMatchObject({
      status: "authenticated",
      token: "app-token",
      user: {
        publicTag: "nicolas#0047"
      }
    });
  });

  it("creates a public tag after the first Google login", async () => {
    let createdUser: CreateUserInput | null = null;
    const useCase = new CompleteGoogleProfileUseCase(
      createUserRepository({
        create: async (input) => {
          createdUser = input;
          return {
            id: USER_ID,
            pseudo: input.pseudo,
            publicTag: input.publicTag,
            passwordHash: input.passwordHash ?? null,
            googleSub: input.googleSub ?? null,
            createdAt: new Date("2026-05-22T08:00:00.000Z")
          };
        }
      }),
      googleIdentity,
      tokenService,
      () => 47
    );

    await expect(useCase.execute({ idToken: "google-id-token", pseudo: "nicolas" })).resolves.toMatchObject({
      token: "app-token",
      user: {
        pseudo: "nicolas",
        publicTag: "nicolas#0047"
      }
    });
    expect(createdUser).toEqual({
      pseudo: "nicolas",
      publicTag: "nicolas#0047",
      googleSub: GOOGLE_SUB
    });
  });
});
