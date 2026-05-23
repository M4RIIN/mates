import type {
  FriendRequestCreatedNotification,
  InvitationCancelledNotification,
  InvitationCreatedNotification,
  NotificationGateway
} from "../../application/ports/notification-gateway.js";
import type { PushTokenRecord } from "../../application/ports/push-token-repository.js";
import { formatFrenchTime } from "../../domain/shared/date.js";

export class ConsoleNotificationGateway implements NotificationGateway {
  async sendInvitationCreated(tokens: PushTokenRecord[], notification: InvitationCreatedNotification): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    console.info("Mock notification: invitation.created", {
      tokenCount: tokens.length,
      invitationId: notification.invitationId,
      placeName: notification.placeName,
      scheduledTime: formatFrenchTime(notification.scheduledAt)
    });
  }

  async sendInvitationCancelled(tokens: PushTokenRecord[], notification: InvitationCancelledNotification): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    console.info("Mock notification: invitation.cancelled", {
      tokenCount: tokens.length,
      invitationId: notification.invitationId,
      placeName: notification.placeName,
      scheduledTime: formatFrenchTime(notification.scheduledAt)
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
