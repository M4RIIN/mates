import { useEffect, useRef } from "react";
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
