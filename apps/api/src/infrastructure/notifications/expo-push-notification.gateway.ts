import type {
  FriendRequestCreatedNotification,
  InvitationCreatedNotification,
  NotificationGateway
} from "../../application/ports/notification-gateway.js";
import type { PushTokenRecord } from "../../application/ports/push-token-repository.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

type ExpoPushMessage = {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: Record<string, string>;
};

type ExpoPushTicket =
  | {
      status: "ok";
      id: string;
    }
  | {
      status: "error";
      message: string;
      details?: {
        error?: string;
      };
    };

export class ExpoPushNotificationGateway implements NotificationGateway {
  async sendInvitationCreated(tokens: PushTokenRecord[], notification: InvitationCreatedNotification): Promise<void> {
    const expoTokens = tokens.map((token) => token.token).filter(isExpoPushToken);
    if (expoTokens.length === 0) {
      return;
    }

    const messages = expoTokens.map<ExpoPushMessage>((token) => ({
      to: token,
      sound: "default",
      title: `${notification.creatorPseudo} t'invite`,
      body: `${notification.placeName} aujourd'hui`,
      data: {
        type: "invitation.created",
        invitationId: notification.invitationId,
        scheduledAt: notification.scheduledAt.toISOString()
      }
    }));

    for (let index = 0; index < messages.length; index += EXPO_BATCH_SIZE) {
      await this.sendBatch(messages.slice(index, index + EXPO_BATCH_SIZE));
    }
  }

  async sendFriendRequestCreated(tokens: PushTokenRecord[], notification: FriendRequestCreatedNotification): Promise<void> {
    const expoTokens = tokens.map((token) => token.token).filter(isExpoPushToken);
    if (expoTokens.length === 0) {
      return;
    }

    const messages = expoTokens.map<ExpoPushMessage>((token) => ({
      to: token,
      sound: "default",
      title: `${notification.requesterPseudo} veut t'ajouter`,
      body: `Demande d'ami de ${notification.requesterTag}`,
      data: {
        type: "friend.requested",
        friendshipId: notification.friendshipId,
        requesterTag: notification.requesterTag
      }
    }));

    for (let index = 0; index < messages.length; index += EXPO_BATCH_SIZE) {
      await this.sendBatch(messages.slice(index, index + EXPO_BATCH_SIZE));
    }
  }

  private async sendBatch(messages: ExpoPushMessage[]): Promise<void> {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messages)
    });
    const responseBody = await response.text();

    if (!response.ok) {
      throw new Error(`Expo push request failed with status ${response.status}: ${responseBody.slice(0, 500)}`);
    }

    const payload = parseJson(responseBody);
    for (const ticket of getExpoTickets(payload)) {
      if (ticket.status === "error") {
        console.warn("Expo push ticket error", {
          message: ticket.message,
          code: ticket.details?.error
        });
      }
    }
  }
}

function isExpoPushToken(token: string): boolean {
  return /^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/.test(token);
}

function parseJson(body: string): unknown {
  if (body.trim().length === 0) {
    return null;
  }

  return JSON.parse(body) as unknown;
}

function getExpoTickets(payload: unknown): ExpoPushTicket[] {
  if (!isRecord(payload)) {
    return [];
  }

  const data = payload.data;
  if (Array.isArray(data)) {
    return data.filter(isExpoPushTicket);
  }

  return isExpoPushTicket(data) ? [data] : [];
}

function isExpoPushTicket(value: unknown): value is ExpoPushTicket {
  if (!isRecord(value) || typeof value.status !== "string") {
    return false;
  }

  if (value.status === "ok") {
    return typeof value.id === "string";
  }

  return value.status === "error" && typeof value.message === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
