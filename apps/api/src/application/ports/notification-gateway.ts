import type { PushTokenRecord } from "./push-token-repository.js";

export type InvitationCreatedNotification = {
  invitationId: string;
  creatorPseudo: string;
  placeName: string;
  scheduledAt: Date;
};

export interface NotificationGateway {
  sendInvitationCreated(tokens: PushTokenRecord[], notification: InvitationCreatedNotification): Promise<void>;
}
