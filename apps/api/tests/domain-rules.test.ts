import { describe, expect, it } from "vitest";
import type {
  CreateInvitationRecordInput,
  InvitationDetailsRecord,
  InvitationRecipientRecord,
  InvitationRepository,
  ReceivedInvitationRecord,
  UpdateInvitationResponseInput
} from "../src/application/ports/invitation-repository.js";
import { CreateInvitationUseCase } from "../src/application/use-cases/create-invitation.use-case.js";
import { RespondToInvitationUseCase } from "../src/application/use-cases/respond-to-invitation.use-case.js";
import { AppError } from "../src/domain/shared/app-error.js";
import { normalizeInvitationResponse } from "../src/domain/invitation/invitation-rules.js";
import { generatePublicTag } from "../src/domain/user/public-tag.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const INVITATION_ID = "22222222-2222-4222-8222-222222222222";
const RECIPIENT_ID = "33333333-3333-4333-8333-333333333333";

function createInvitationRepository(overrides: Partial<InvitationRepository> = {}): InvitationRepository {
  return {
    create: async (input: CreateInvitationRecordInput) => ({
      ...input,
      id: INVITATION_ID,
      createdAt: new Date("2026-05-16T08:00:00.000Z")
    }),
    addRecipients: async () => undefined,
    findRecipient: async () => null,
    updateRecipientResponse: async (input: UpdateInvitationResponseInput) => ({
      id: input.recipientId,
      invitationId: INVITATION_ID,
      userId: USER_ID,
      responseStatus: input.responseStatus,
      delayMinutes: input.delayMinutes,
      respondedAt: input.respondedAt
    }),
    getDetails: async (): Promise<InvitationDetailsRecord | null> => null,
    listCreatedByUser: async (): Promise<InvitationDetailsRecord[]> => [],
    listReceivedByUser: async (): Promise<ReceivedInvitationRecord[]> => [],
    ...overrides
  };
}

describe("public tag generation", () => {
  it("generates pseudo#dddd with a padded deterministic suffix", () => {
    expect(generatePublicTag("nicolas", () => 47)).toBe("nicolas#0047");
  });
});

describe("invitation scheduling rules", () => {
  it("allows invitations scheduled during the current local day", async () => {
    const useCase = new CreateInvitationUseCase(createInvitationRepository());

    const invitation = await useCase.execute({
      creatorId: USER_ID,
      placeName: "Cafe Central",
      scheduledAt: "2026-05-16T20:30:00.000Z",
      now: new Date("2026-05-16T08:00:00.000Z")
    });

    expect(invitation.scheduledAt.toISOString()).toBe("2026-05-16T20:30:00.000Z");
  });

  it("rejects invitations outside the current local day", async () => {
    const useCase = new CreateInvitationUseCase(createInvitationRepository());

    await expect(
      useCase.execute({
        creatorId: USER_ID,
        placeName: "Cafe Central",
        scheduledAt: "2026-05-17T00:30:00.000Z",
        now: new Date("2026-05-16T08:00:00.000Z")
      })
    ).rejects.toMatchObject({
      code: "INVITATION_DATE_NOT_TODAY"
    });
  });
});

describe("invitation responses", () => {
  it("accepts a yes response with an estimated delay", () => {
    const response = normalizeInvitationResponse("yes", 15, new Date("2026-05-16T09:00:00.000Z"));

    expect(response).toMatchObject({
      responseStatus: "yes",
      delayMinutes: 15
    });
  });

  it("accepts a no response without delay", () => {
    const response = normalizeInvitationResponse("no", undefined, new Date("2026-05-16T09:00:00.000Z"));

    expect(response).toMatchObject({
      responseStatus: "no",
      delayMinutes: null
    });
  });

  it("rejects a no response with delay", () => {
    expect(() => normalizeInvitationResponse("no", 10)).toThrow(AppError);
  });

  it("prevents responding to an invitation not received by the user", async () => {
    const useCase = new RespondToInvitationUseCase(
      createInvitationRepository({
        findRecipient: async (): Promise<InvitationRecipientRecord | null> => null
      })
    );

    await expect(
      useCase.execute({
        invitationId: INVITATION_ID,
        userId: USER_ID,
        status: "yes",
        delayMinutes: 5
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });

  it("lets a recipient update their response", async () => {
    const useCase = new RespondToInvitationUseCase(
      createInvitationRepository({
        findRecipient: async (): Promise<InvitationRecipientRecord | null> => ({
          id: RECIPIENT_ID,
          invitationId: INVITATION_ID,
          userId: USER_ID,
          responseStatus: "pending",
          delayMinutes: null,
          respondedAt: null
        })
      })
    );

    const response = await useCase.execute({
      invitationId: INVITATION_ID,
      userId: USER_ID,
      status: "yes",
      delayMinutes: 20
    });

    expect(response).toMatchObject({
      id: RECIPIENT_ID,
      responseStatus: "yes",
      delayMinutes: 20
    });
  });
});
