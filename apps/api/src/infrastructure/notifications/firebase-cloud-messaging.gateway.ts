import admin from "firebase-admin";
import type {
  InvitationCreatedNotification,
  NotificationGateway
} from "../../application/ports/notification-gateway.js";
import type { PushTokenRecord } from "../../application/ports/push-token-repository.js";

export class FirebaseCloudMessagingGateway implements NotificationGateway {
  constructor(serviceAccountJson: string | undefined) {
    if (admin.apps.length > 0) {
      return;
    }

    if (serviceAccountJson !== undefined && serviceAccountJson.trim().length > 0) {
      const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      return;
    }

    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }

  async sendInvitationCreated(tokens: PushTokenRecord[], notification: InvitationCreatedNotification): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    await admin.messaging().sendEachForMulticast({
      tokens: tokens.map((token) => token.token),
      notification: {
        title: `${notification.creatorPseudo} t'invite`,
        body: `${notification.placeName} aujourd'hui`
      },
      data: {
        type: "invitation.created",
        invitationId: notification.invitationId,
        scheduledAt: notification.scheduledAt.toISOString()
      }
    });
  }
}
