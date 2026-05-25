import { describe, expect, it } from "vitest";
import type {
  CreateInvitationAuditEventInput,
  CreateInvitationRecordInput,
  InvitationAuditEventRecord,
  InvitationDetailsRecord,
  InvitationRecipientRecord,
  InvitationRepository,
  InvitationRecord,
  ReceivedInvitationRecord,
  UpdateInvitationResponseInput
} from "../src/application/ports/invitation-repository.js";
import { CreateInvitationUseCase } from "../src/application/use-cases/create-invitation.use-case.js";
import { RespondToInvitationUseCase } from "../src/application/use-cases/respond-to-invitation.use-case.js";
import { SendInvitationToFriendsUseCase } from "../src/application/use-cases/send-invitation-to-friends.use-case.js";
import { TrackInvitationAuditEventUseCase } from "../src/application/use-cases/track-invitation-audit-event.use-case.js";
import { AppError } from "../src/domain/shared/app-error.js";
import { normalizeInvitationResponse } from "../src/domain/invitation/invitation-rules.js";
import { generatePublicTag } from "../src/domain/user/public-tag.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const INVITATION_ID = "22222222-2222-4222-8222-222222222222";
const RECIPIENT_ID = "33333333-3333-4333-8333-333333333333";
const AUDIT_EVENT_ID = "44444444-4444-4444-8444-444444444444";

function createInvitationRepository(overrides: Partial<InvitationRepository> = {}): InvitationRepository {
  return {
    create: async (input: CreateInvitationRecordInput) => ({
      ...input,
      id: INVITATION_ID,
      createdAt: new Date("2026-05-16T08:00:00.000Z"),
      canceledAt: null
    }),
    addRecipients: async () => undefined,
    createAuditEvent: async (input: CreateInvitationAuditEventInput): Promise<InvitationAuditEventRecord> => ({
      id: AUDIT_EVENT_ID,
      invitationId: input.invitationId,
      parentAuditEventId: input.parentAuditEventId,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      placeName: input.placeName,
      placeAddress: input.placeAddress,
      scheduledAt: input.scheduledAt,
      invitedCount: input.invitedCount,
      createdAt: new Date("2026-05-16T08:00:00.000Z")
    }),
    findCreatedAuditEvent: async (): Promise<InvitationAuditEventRecord | null> => ({
      id: AUDIT_EVENT_ID,
      invitationId: INVITATION_ID,
      parentAuditEventId: null,
      actorUserId: USER_ID,
      eventType: "created",
      placeName: "Cafe Central",
      placeAddress: null,
      scheduledAt: new Date("2026-05-16T20:30:00.000Z"),
      invitedCount: 3,
      createdAt: new Date("2026-05-16T08:00:00.000Z")
    }),
    findRecipient: async () => null,
    updateRecipientResponse: async (input: UpdateInvitationResponseInput) => ({
      id: input.recipientId,
      invitationId: INVITATION_ID,
      userId: USER_ID,
      responseStatus: input.responseStatus,
      delayMinutes: input.delayMinutes,
      respondedAt: input.respondedAt
    }),
    cancel: async (invitationId: string, canceledAt: Date): Promise<InvitationRecord> => ({
      id: invitationId,
      creatorId: USER_ID,
      friendGroupId: null,
      placeName: "Cafe Central",
      placeAddress: null,
      latitude: null,
      longitude: null,
      scheduledAt: new Date("2026-05-16T20:30:00.000Z"),
      createdAt: new Date("2026-05-16T08:00:00.000Z"),
      canceledAt
    }),
    getDetails: async (): Promise<InvitationDetailsRecord | null> => null,
    findActiveByCreator: async (): Promise<InvitationDetailsRecord | null> => null,
    listCreatedByUser: async (): Promise<InvitationDetailsRecord[]> => [],
    listReceivedByUser: async (): Promise<ReceivedInvitationRecord[]> => [],
    ...overrides
  };
}

function buildInvitationDetails(overrides: Partial<InvitationDetailsRecord> = {}): InvitationDetailsRecord {
  return {
    id: INVITATION_ID,
    creatorId: "99999999-9999-4999-8999-999999999999",
    creator: {
      id: "99999999-9999-4999-8999-999999999999",
      pseudo: "lea",
      publicTag: "lea#1234"
    },
    friendGroupId: null,
    friendGroup: null,
    placeName: "Cafe Central",
    placeAddress: null,
    latitude: null,
    longitude: null,
    scheduledAt: new Date("2026-05-16T20:30:00.000Z"),
    createdAt: new Date("2026-05-16T08:00:00.000Z"),
    canceledAt: null,
    recipients: [],
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
        getDetails: async (): Promise<InvitationDetailsRecord | null> => buildInvitationDetails(),
        findRecipient: async (): Promise<InvitationRecipientRecord | null> => null
      }),
      { publishToUser: async () => undefined, publishToUsers: async () => undefined }
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
        getDetails: async (): Promise<InvitationDetailsRecord | null> => buildInvitationDetails(),
        findRecipient: async (): Promise<InvitationRecipientRecord | null> => ({
          id: RECIPIENT_ID,
          invitationId: INVITATION_ID,
          userId: USER_ID,
          responseStatus: "pending",
          delayMinutes: null,
          respondedAt: null
        })
      }),
      { publishToUser: async () => undefined, publishToUsers: async () => undefined }
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

  it("creates an accepted audit event for yes responses", async () => {
    let createdAuditEvent: InvitationAuditEventRecord | null = null;

    const useCase = new RespondToInvitationUseCase(
      createInvitationRepository({
        getDetails: async (): Promise<InvitationDetailsRecord | null> =>
          buildInvitationDetails({
            recipients: [
              {
                id: RECIPIENT_ID,
                user: {
                  id: USER_ID,
                  pseudo: "nicolas",
                  publicTag: "nicolas#0047"
                },
                responseStatus: "pending",
                delayMinutes: null,
                respondedAt: null
              }
            ]
          }),
        findRecipient: async (): Promise<InvitationRecipientRecord | null> => ({
          id: RECIPIENT_ID,
          invitationId: INVITATION_ID,
          userId: USER_ID,
          responseStatus: "pending",
          delayMinutes: null,
          respondedAt: null
        }),
        createAuditEvent: async (input) => {
          createdAuditEvent = await createInvitationRepository().createAuditEvent(input);
          return createdAuditEvent;
        }
      }),
      { publishToUser: async () => undefined, publishToUsers: async () => undefined }
    );

    await useCase.execute({
      invitationId: INVITATION_ID,
      userId: USER_ID,
      status: "yes"
    });

    expect(createdAuditEvent).toMatchObject({
      parentAuditEventId: AUDIT_EVENT_ID,
      actorUserId: USER_ID,
      eventType: "accepted",
      invitedCount: 1
    });
  });

  it("blocks responses to a cancelled invitation", async () => {
    const useCase = new RespondToInvitationUseCase(
      createInvitationRepository({
        getDetails: async (): Promise<InvitationDetailsRecord | null> =>
          buildInvitationDetails({
            canceledAt: new Date("2026-05-16T09:30:00.000Z")
          })
      }),
      { publishToUser: async () => undefined, publishToUsers: async () => undefined }
    );

    await expect(
      useCase.execute({
        invitationId: INVITATION_ID,
        userId: USER_ID,
        status: "yes"
      })
    ).rejects.toMatchObject({
      code: "INVITATION_CANCELLED"
    });
  });
});

describe("active invitation rules", () => {
  it("prevents creating a second active invitation", async () => {
    const useCase = new SendInvitationToFriendsUseCase(
      createInvitationRepository({
        findActiveByCreator: async (): Promise<InvitationDetailsRecord | null> =>
          buildInvitationDetails({
            creatorId: USER_ID,
            creator: {
              id: USER_ID,
              pseudo: "nicolas",
              publicTag: "nicolas#0047"
            }
          })
      }),
      { listActiveFriends: async () => [] },
      {
        findByIdForOwner: async () => null,
        listByOwner: async () => [],
        create: async () => buildFriendGroupDetails(),
        replaceMembers: async () => buildFriendGroupDetails()
      },
      { findById: async () => ({ id: USER_ID, pseudo: "nicolas", publicTag: "nicolas#0047", createdAt: new Date() }) },
      { listByUserIds: async () => [] },
      {
        sendInvitationCreated: async () => undefined,
        sendInvitationCancelled: async () => undefined,
        sendFriendRequestCreated: async () => undefined
      },
      { publishToUser: async () => undefined, publishToUsers: async () => undefined }
    );

    await expect(
      useCase.execute({
        creatorId: USER_ID,
        placeName: "Autre lieu",
        scheduledAt: "2026-05-16T21:00:00.000Z",
        now: new Date("2026-05-16T10:00:00.000Z")
      })
    ).rejects.toMatchObject({
      code: "INVITATION_ALREADY_ACTIVE",
      details: {
        invitationId: INVITATION_ID
      }
    });
  });

  it("targets only members of the selected friend group", async () => {
    const capturedRecipientBatches: string[][] = [];

    const useCase = new SendInvitationToFriendsUseCase(
      createInvitationRepository({
        addRecipients: async (_invitationId, userIds) => {
          capturedRecipientBatches.push(userIds);
        },
        getDetails: async (): Promise<InvitationDetailsRecord | null> => buildInvitationDetails()
      }),
      {
        findByIdForOwner: async () => buildFriendGroupDetails(),
        listByOwner: async () => [],
        create: async () => buildFriendGroupDetails(),
        replaceMembers: async () => buildFriendGroupDetails()
      },
      {
        listActiveFriends: async () => [
          { id: "friend-a", pseudo: "alice", publicTag: "alice#1111", friendshipCreatedAt: new Date() },
          { id: "friend-b", pseudo: "bob", publicTag: "bob#2222", friendshipCreatedAt: new Date() }
        ]
      },
      { findById: async () => ({ id: USER_ID, pseudo: "nicolas", publicTag: "nicolas#0047", createdAt: new Date() }) },
      { listByUserIds: async () => [] },
      {
        sendInvitationCreated: async () => undefined,
        sendInvitationCancelled: async () => undefined,
        sendFriendRequestCreated: async () => undefined
      },
      { publishToUser: async () => undefined, publishToUsers: async () => undefined }
    );

    await useCase.execute({
      creatorId: USER_ID,
      placeName: "Cafe Central",
      scheduledAt: "2026-05-16T21:00:00.000Z",
      friendGroupId: "44444444-4444-4444-8444-444444444444",
      now: new Date("2026-05-16T10:00:00.000Z")
    });

    expect(capturedRecipientBatches).toEqual([["friend-a"]]);
  });

  it("targets only the selected friend", async () => {
    const capturedRecipientBatches: string[][] = [];

    const useCase = new SendInvitationToFriendsUseCase(
      createInvitationRepository({
        addRecipients: async (_invitationId, userIds) => {
          capturedRecipientBatches.push(userIds);
        },
        getDetails: async (): Promise<InvitationDetailsRecord | null> => buildInvitationDetails()
      }),
      {
        findByIdForOwner: async () => buildFriendGroupDetails(),
        listByOwner: async () => [],
        create: async () => buildFriendGroupDetails(),
        replaceMembers: async () => buildFriendGroupDetails()
      },
      {
        listActiveFriends: async () => [
          { id: "friend-a", pseudo: "alice", publicTag: "alice#1111", friendshipCreatedAt: new Date() },
          { id: "friend-b", pseudo: "bob", publicTag: "bob#2222", friendshipCreatedAt: new Date() }
        ]
      },
      { findById: async () => ({ id: USER_ID, pseudo: "nicolas", publicTag: "nicolas#0047", createdAt: new Date() }) },
      { listByUserIds: async () => [] },
      {
        sendInvitationCreated: async () => undefined,
        sendInvitationCancelled: async () => undefined,
        sendFriendRequestCreated: async () => undefined
      },
      { publishToUser: async () => undefined, publishToUsers: async () => undefined }
    );

    await useCase.execute({
      creatorId: USER_ID,
      placeName: "Cafe Central",
      scheduledAt: "2026-05-16T21:00:00.000Z",
      friendUserIds: ["friend-b"],
      now: new Date("2026-05-16T10:00:00.000Z")
    });

    expect(capturedRecipientBatches).toEqual([["friend-b"]]);
  });
});

describe("invitation audit actions", () => {
  it("tracks uber clicks under the created audit event", async () => {
    const useCase = new TrackInvitationAuditEventUseCase(
      createInvitationRepository({
        getDetails: async (): Promise<InvitationDetailsRecord | null> =>
          buildInvitationDetails({
            recipients: [
              {
                id: RECIPIENT_ID,
                user: {
                  id: USER_ID,
                  pseudo: "nicolas",
                  publicTag: "nicolas#0047"
                },
                responseStatus: "pending",
                delayMinutes: null,
                respondedAt: null
              }
            ]
          })
      })
    );

    const auditEvent = await useCase.execute({
      invitationId: INVITATION_ID,
      userId: USER_ID,
      action: "uber_requested"
    });

    expect(auditEvent).toMatchObject({
      parentAuditEventId: AUDIT_EVENT_ID,
      actorUserId: USER_ID,
      eventType: "uber_requested",
      invitedCount: 1
    });
  });
});

function buildFriendGroupDetails() {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    ownerId: USER_ID,
    name: "proches",
    createdAt: new Date("2026-05-16T08:00:00.000Z"),
    members: [{ id: "friend-a", pseudo: "alice", publicTag: "alice#1111" }]
  };
}
