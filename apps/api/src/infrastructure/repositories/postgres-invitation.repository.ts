import { and, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import type {
  CreateInvitationAuditEventInput,
  CreateInvitationRecordInput,
  InvitationAuditEventRecord,
  InvitationDetailsRecord,
  InvitationFriendGroupRecord,
  InvitationParticipantRecord,
  InvitationRecipientRecord,
  InvitationRecord,
  InvitationRepository,
  ReceivedInvitationRecord,
  UpdateInvitationResponseInput
} from "../../application/ports/invitation-repository.js";
import { endOfLocalDay, startOfLocalDay } from "../../domain/shared/date.js";
import type { PublicUserRecord } from "../../application/ports/user-repository.js";
import type { AppDb } from "../db/client.js";
import { friendGroups, invitationAuditEvents, invitationRecipients, invitations, users } from "../db/schema.js";

function toInvitationRecord(row: typeof invitations.$inferSelect): InvitationRecord {
  return {
    id: row.id,
    creatorId: row.creatorId,
    friendGroupId: row.friendGroupId,
    placeName: row.placeName,
    placeAddress: row.placeAddress,
    latitude: row.latitude,
    longitude: row.longitude,
    scheduledAt: row.scheduledAt,
    createdAt: row.createdAt,
    canceledAt: row.canceledAt
  };
}

function toInvitationFriendGroupRecord(row: typeof friendGroups.$inferSelect): InvitationFriendGroupRecord {
  return {
    id: row.id,
    name: row.name
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

function toAuditEventRecord(row: typeof invitationAuditEvents.$inferSelect): InvitationAuditEventRecord {
  return {
    id: row.id,
    invitationId: row.invitationId,
    parentAuditEventId: row.parentAuditEventId,
    actorUserId: row.actorUserId,
    eventType: row.eventType,
    placeName: row.placeName,
    placeAddress: row.placeAddress,
    scheduledAt: row.scheduledAt,
    invitedCount: row.invitedCount,
    createdAt: row.createdAt
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
        friendGroupId: input.friendGroupId,
        placeName: input.placeName,
        placeAddress: input.placeAddress,
        latitude: input.latitude,
        longitude: input.longitude,
        scheduledAt: input.scheduledAt,
        canceledAt: null
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

  async createAuditEvent(input: CreateInvitationAuditEventInput): Promise<InvitationAuditEventRecord> {
    const [created] = await this.db
      .insert(invitationAuditEvents)
      .values({
        invitationId: input.invitationId,
        parentAuditEventId: input.parentAuditEventId,
        actorUserId: input.actorUserId,
        eventType: input.eventType,
        placeName: input.placeName,
        placeAddress: input.placeAddress,
        scheduledAt: input.scheduledAt,
        invitedCount: input.invitedCount
      })
      .returning();

    if (created === undefined) {
      throw new Error("Invitation audit event creation failed");
    }

    return toAuditEventRecord(created);
  }

  async findCreatedAuditEvent(invitationId: string): Promise<InvitationAuditEventRecord | null> {
    const [row] = await this.db
      .select()
      .from(invitationAuditEvents)
      .where(and(eq(invitationAuditEvents.invitationId, invitationId), eq(invitationAuditEvents.eventType, "created")))
      .limit(1);

    return row === undefined ? null : toAuditEventRecord(row);
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

  async cancel(invitationId: string, canceledAt: Date): Promise<InvitationRecord> {
    const [updated] = await this.db
      .update(invitations)
      .set({
        canceledAt
      })
      .where(eq(invitations.id, invitationId))
      .returning();

    if (updated === undefined) {
      throw new Error("Invitation cancel failed");
    }

    return toInvitationRecord(updated);
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
    const [friendGroupRow] =
      invitationRow.friendGroupId === null
        ? []
        : await this.db.select().from(friendGroups).where(eq(friendGroups.id, invitationRow.friendGroupId)).limit(1);

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
      friendGroup: friendGroupRow === undefined ? null : toInvitationFriendGroupRecord(friendGroupRow),
      recipients
    };
  }

  async findActiveByCreator(userId: string, now: Date): Promise<InvitationDetailsRecord | null> {
    const [row] = await this.db
      .select({ id: invitations.id })
      .from(invitations)
      .where(
        and(
          eq(invitations.creatorId, userId),
          isNull(invitations.canceledAt),
          gte(invitations.scheduledAt, startOfLocalDay(now)),
          lt(invitations.scheduledAt, endOfLocalDay(now))
        )
      )
      .orderBy(desc(invitations.createdAt))
      .limit(1);

    if (row === undefined) {
      return null;
    }

    return this.getDetails(row.id);
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
