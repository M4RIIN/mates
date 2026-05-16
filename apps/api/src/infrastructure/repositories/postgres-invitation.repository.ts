import { and, desc, eq, inArray } from "drizzle-orm";
import type {
  CreateInvitationRecordInput,
  InvitationDetailsRecord,
  InvitationParticipantRecord,
  InvitationRecipientRecord,
  InvitationRecord,
  InvitationRepository,
  ReceivedInvitationRecord,
  UpdateInvitationResponseInput
} from "../../application/ports/invitation-repository.js";
import type { PublicUserRecord } from "../../application/ports/user-repository.js";
import type { AppDb } from "../db/client.js";
import { invitationRecipients, invitations, users } from "../db/schema.js";

function toInvitationRecord(row: typeof invitations.$inferSelect): InvitationRecord {
  return {
    id: row.id,
    creatorId: row.creatorId,
    placeName: row.placeName,
    placeAddress: row.placeAddress,
    latitude: row.latitude,
    longitude: row.longitude,
    scheduledAt: row.scheduledAt,
    createdAt: row.createdAt
  };
}

function toRecipientRecord(row: typeof invitationRecipients.$inferSelect): InvitationRecipientRecord {
  return {
    id: row.id,
    invitationId: row.invitationId,
    userId: row.userId,
    responseStatus: row.responseStatus,
    delayMinutes: row.delayMinutes,
    respondedAt: row.respondedAt
  };
}

function toPublicUserRecord(row: typeof users.$inferSelect): PublicUserRecord {
  return {
    id: row.id,
    pseudo: row.pseudo,
    publicTag: row.publicTag
  };
}

export class PostgresInvitationRepository implements InvitationRepository {
  constructor(private readonly db: AppDb) {}

  async create(input: CreateInvitationRecordInput): Promise<InvitationRecord> {
    const [created] = await this.db
      .insert(invitations)
      .values({
        creatorId: input.creatorId,
        placeName: input.placeName,
        placeAddress: input.placeAddress,
        latitude: input.latitude,
        longitude: input.longitude,
        scheduledAt: input.scheduledAt
      })
      .returning();

    if (created === undefined) {
      throw new Error("Invitation creation failed");
    }

    return toInvitationRecord(created);
  }

  async addRecipients(invitationId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    await this.db
      .insert(invitationRecipients)
      .values(
        userIds.map((userId) => ({
          invitationId,
          userId,
          responseStatus: "pending" as const,
          delayMinutes: null,
          respondedAt: null
        }))
      )
      .onConflictDoNothing();
  }

  async findRecipient(invitationId: string, userId: string): Promise<InvitationRecipientRecord | null> {
    const [recipient] = await this.db
      .select()
      .from(invitationRecipients)
      .where(and(eq(invitationRecipients.invitationId, invitationId), eq(invitationRecipients.userId, userId)))
      .limit(1);

    return recipient === undefined ? null : toRecipientRecord(recipient);
  }

  async updateRecipientResponse(input: UpdateInvitationResponseInput): Promise<InvitationRecipientRecord> {
    const [updated] = await this.db
      .update(invitationRecipients)
      .set({
        responseStatus: input.responseStatus,
        delayMinutes: input.delayMinutes,
        respondedAt: input.respondedAt
      })
      .where(eq(invitationRecipients.id, input.recipientId))
      .returning();

    if (updated === undefined) {
      throw new Error("Invitation response update failed");
    }

    return toRecipientRecord(updated);
  }

  async getDetails(invitationId: string): Promise<InvitationDetailsRecord | null> {
    const [invitationRow] = await this.db.select().from(invitations).where(eq(invitations.id, invitationId)).limit(1);
    if (invitationRow === undefined) {
      return null;
    }

    const [creatorRow] = await this.db.select().from(users).where(eq(users.id, invitationRow.creatorId)).limit(1);
    if (creatorRow === undefined) {
      throw new Error("Invitation creator not found");
    }

    const recipientRows = await this.db
      .select()
      .from(invitationRecipients)
      .where(eq(invitationRecipients.invitationId, invitationId));

    const recipientUserIds = recipientRows.map((recipient) => recipient.userId);
    const recipientUsers =
      recipientUserIds.length === 0
        ? []
        : await this.db.select().from(users).where(inArray(users.id, recipientUserIds));
    const usersById = new Map(recipientUsers.map((user) => [user.id, user]));

    const recipients: InvitationParticipantRecord[] = recipientRows.map((recipient) => {
      const user = usersById.get(recipient.userId);
      if (user === undefined) {
        throw new Error("Invitation recipient user not found");
      }

      return {
        id: recipient.id,
        user: toPublicUserRecord(user),
        responseStatus: recipient.responseStatus,
        delayMinutes: recipient.delayMinutes,
        respondedAt: recipient.respondedAt
      };
    });

    return {
      ...toInvitationRecord(invitationRow),
      creator: toPublicUserRecord(creatorRow),
      recipients
    };
  }

  async listCreatedByUser(userId: string): Promise<InvitationDetailsRecord[]> {
    const rows = await this.db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.creatorId, userId))
      .orderBy(desc(invitations.createdAt));

    const details = await Promise.all(rows.map((row) => this.getDetails(row.id)));
    return details.filter((detail): detail is InvitationDetailsRecord => detail !== null);
  }

  async listReceivedByUser(userId: string): Promise<ReceivedInvitationRecord[]> {
    const recipientRows = await this.db
      .select()
      .from(invitationRecipients)
      .where(eq(invitationRecipients.userId, userId));

    const details = await Promise.all(recipientRows.map((recipient) => this.getDetails(recipient.invitationId)));
    const received: ReceivedInvitationRecord[] = [];

    details.forEach((detail) => {
      if (detail === null) {
        return;
      }

      const myResponse = detail.recipients.find((recipient) => recipient.user.id === userId);
      if (myResponse !== undefined) {
        received.push({
          ...detail,
          myResponse
        });
      }
    });

    return received.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}
