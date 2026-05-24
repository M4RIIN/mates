import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { Platform } from "react-native";
import { useApiClient } from "./useApiClient";
import { getDevicePushToken } from "@/infrastructure/notifications/expo-notifications";
import { useAuthStore } from "@/infrastructure/storage/auth-store";

export function useRegisterPushNotifications() {
  const api = useApiClient();
  const token = useAuthStore((state) => state.token);
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function register() {
      if (token === null) {
        return;
      }

      const deviceToken = await getDevicePushToken();
      if (!isMounted || deviceToken === null || registeredTokenRef.current === deviceToken.token) {
        return;
      }

      await api.registerPushToken(deviceToken);
      registeredTokenRef.current = deviceToken.token;
    }

    register().catch((error: unknown) => {
      console.warn("Push token registration failed", error);
    });

    return () => {
      isMounted = false;
    };
  }, [api, token]);
}

export function useNotificationNavigation() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const handledNotificationRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web" || !hasHydrated || token === null) {
      return;
    }

    let isCancelled = false;

    function openFromResponse(response: import("expo-notifications").NotificationResponse | null) {
      const notificationId = response?.notification.request.identifier;
      if (notificationId === undefined || handledNotificationRef.current === notificationId) {
        return;
      }

      const type = response?.notification.request.content.data?.type;
      if (typeof type !== "string" || type.trim().length === 0) {
        return;
      }

      handledNotificationRef.current = notificationId;
      if (type === "invitation.created" || type === "invitation.cancelled") {
        const invitationId = response?.notification.request.content.data?.invitationId;
        if (typeof invitationId !== "string" || invitationId.trim().length === 0) {
          return;
        }

        if (type === "invitation.cancelled") {
          endInvitationLiveActivity(invitationId).catch((error: unknown) => {
            console.warn("Failed to end invitation live activity", error);
          });
        }

        router.push({
          pathname: "/invitations/received/[id]",
          params: { id: invitationId }
        });
      }

      if (type === "friend.requested") {
        router.push("/friends");
      }
    }

    const notificationSubscriptionPromise = import("expo-notifications")
      .then((Notifications) => {
        if (isCancelled) {
          return null;
        }

        Notifications.getLastNotificationResponseAsync()
          .then((response) => {
            if (!isCancelled) {
              openFromResponse(response);
            }
          })
          .catch((error: unknown) => {
            console.warn("Failed to inspect last notification response", error);
          });

        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          openFromResponse(response);
        });

        const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
          const type = notification.request.content.data?.type;
          const invitationId = notification.request.content.data?.invitationId;

          if (type === "invitation.cancelled" && typeof invitationId === "string" && invitationId.trim().length > 0) {
            endInvitationLiveActivity(invitationId).catch((error: unknown) => {
              console.warn("Failed to end invitation live activity", error);
            });
          }
        });

        return { subscription, receivedSubscription };
      })
      .catch((error: unknown) => {
        console.warn("Failed to initialize notification listeners", error);
        return null;
      });

    return () => {
      isCancelled = true;
      notificationSubscriptionPromise
        .then((subscriptions) => {
          subscriptions?.subscription.remove();
          subscriptions?.receivedSubscription.remove();
        })
        .catch(() => undefined);
    };
  }, [hasHydrated, token]);
}

async function endInvitationLiveActivity(invitationId: string) {
  if (Platform.OS !== "ios") {
    return;
  }

  const liveActivities = await import("@/infrastructure/live-activities/invitation-live-activity");
  await liveActivities.endInvitationLiveActivity(invitationId);
}
