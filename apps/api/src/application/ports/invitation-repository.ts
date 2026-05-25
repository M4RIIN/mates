import type { ResponseStatus } from "@mates/shared";
import type { PublicUserRecord } from "./user-repository.js";

export type InvitationFriendGroupRecord = {
  id: string;
  name: string;
};

export type CreateInvitationRecordInput = {
  creatorId: string;
  friendGroupId: string | null;
  placeName: string;
  placeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  scheduledAt: Date;
};

export type InvitationRecord = CreateInvitationRecordInput & {
  id: string;
  createdAt: Date;
  canceledAt: Date | null;
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
  friendGroup: InvitationFriendGroupRecord | null;
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
  cancel(invitationId: string, canceledAt: Date): Promise<InvitationRecord>;
  getDetails(invitationId: string): Promise<InvitationDetailsRecord | null>;
  findActiveByCreator(userId: string, now: Date): Promise<InvitationDetailsRecord | null>;
  listCreatedByUser(userId: string): Promise<InvitationDetailsRecord[]>;
  listReceivedByUser(userId: string): Promise<ReceivedInvitationRecord[]>;
}
