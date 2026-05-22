import type { PushTokenRecord } from "./push-token-repository.js";

export type InvitationCreatedNotification = {
  invitationId: string;
  creatorPseudo: string;
  placeName: string;
  scheduledAt: Date;
};

export type FriendRequestCreatedNotification = {
  friendshipId: string;
  requesterPseudo: string;
  requesterTag: string;
};

export interface NotificationGateway {
  sendInvitationCreated(tokens: PushTokenRecord[], notification: InvitationCreatedNotification): Promise<void>;
  sendFriendRequestCreated(tokens: PushTokenRecord[], notification: FriendRequestCreatedNotification): Promise<void>;
}
