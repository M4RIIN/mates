import type { ResponseStatus } from "@mates/shared";
import type { PublicUserRecord } from "./user-repository.js";

export type CreateInvitationRecordInput = {
  creatorId: string;
  placeName: string;
  placeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  scheduledAt: Date;
};

export type InvitationRecord = CreateInvitationRecordInput & {
  id: string;
  createdAt: Date;
};

export type InvitationRecipientRecord = {
  id: string;
  invitationId: string;
  userId: string;
  responseStatus: ResponseStatus;
  delayMinutes: number | null;
  respondedAt: Date | null;
};

export type InvitationParticipantRecord = {
  id: string;
  user: PublicUserRecord;
  responseStatus: ResponseStatus;
  delayMinutes: number | null;
  respondedAt: Date | null;
};

export type InvitationDetailsRecord = InvitationRecord & {
  creator: PublicUserRecord;
  recipients: InvitationParticipantRecord[];
};

export type ReceivedInvitationRecord = InvitationDetailsRecord & {
  myResponse: InvitationParticipantRecord;
};

export type UpdateInvitationResponseInput = {
  recipientId: string;
  responseStatus: "yes" | "no";
  delayMinutes: number | null;
  respondedAt: Date;
};

export interface InvitationRepository {
  create(input: CreateInvitationRecordInput): Promise<InvitationRecord>;
  addRecipients(invitationId: string, userIds: string[]): Promise<void>;
  findRecipient(invitationId: string, userId: string): Promise<InvitationRecipientRecord | null>;
  updateRecipientResponse(input: UpdateInvitationResponseInput): Promise<InvitationRecipientRecord>;
  getDetails(invitationId: string): Promise<InvitationDetailsRecord | null>;
  listCreatedByUser(userId: string): Promise<InvitationDetailsRecord[]>;
  listReceivedByUser(userId: string): Promise<ReceivedInvitationRecord[]>;
}
