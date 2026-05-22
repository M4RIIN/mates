import { useEffect, useRef } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
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
    if (!hasHydrated || token === null) {
      return;
    }

    function openFromResponse(response: Notifications.NotificationResponse | null) {
      const notificationId = response?.notification.request.identifier;
      if (notificationId === undefined || handledNotificationRef.current === notificationId) {
        return;
      }

      const type = response?.notification.request.content.data?.type;
      if (typeof type !== "string" || type.trim().length === 0) {
        return;
      }

      handledNotificationRef.current = notificationId;
      if (type === "invitation.created") {
        const invitationId = response?.notification.request.content.data?.invitationId;
        if (typeof invitationId !== "string" || invitationId.trim().length === 0) {
          return;
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

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        openFromResponse(response);
      })
      .catch((error: unknown) => {
        console.warn("Failed to inspect last notification response", error);
      });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromResponse(response);
    });

    return () => {
      subscription.remove();
    };
  }, [hasHydrated, token]);
}
