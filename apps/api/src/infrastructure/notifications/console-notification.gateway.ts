import type {
  FriendRequestCreatedNotification,
  InvitationCreatedNotification,
  NotificationGateway
} from "../../application/ports/notification-gateway.js";
import type { PushTokenRecord } from "../../application/ports/push-token-repository.js";

export class ConsoleNotificationGateway implements NotificationGateway {
  async sendInvitationCreated(tokens: PushTokenRecord[], notification: InvitationCreatedNotification): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    console.info("Mock notification: invitation.created", {
      tokenCount: tokens.length,
      invitationId: notification.invitationId,
      placeName: notification.placeName
    });
  }

  async sendFriendRequestCreated(tokens: PushTokenRecord[], notification: FriendRequestCreatedNotification): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    console.info("Mock notification: friend.requested", {
      tokenCount: tokens.length,
      friendshipId: notification.friendshipId,
      requesterTag: notification.requesterTag
    });
  }
}
