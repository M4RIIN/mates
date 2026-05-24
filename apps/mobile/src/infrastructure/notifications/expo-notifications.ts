import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { PushPlatform } from "@mates/shared";

export type DevicePushToken = {
  token: string;
  platform: PushPlatform;
};

export async function getDevicePushToken(): Promise<DevicePushToken | null> {
  if (Platform.OS === "web" || !Device.isDevice) {
    return null;
  }

  const Notifications = await loadExpoNotifications();
  const currentPermissions = await Notifications.getPermissionsAsync();
  const finalPermissions =
    currentPermissions.status === "granted" ? currentPermissions : await Notifications.requestPermissionsAsync();

  if (finalPermissions.status !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX
    });
  }

  const projectId = getExpoProjectId();
  const expoPushToken = await Notifications.getExpoPushTokenAsync({ projectId });

  return {
    token: expoPushToken.data,
    platform: toPushPlatform(Platform.OS)
  };
}

async function loadExpoNotifications() {
  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });

  return Notifications;
}

function getExpoProjectId(): string {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    throw new Error("Expo project ID not found for push notification registration");
  }

  return projectId;
}

function toPushPlatform(platform: string): PushPlatform {
  if (platform === "ios" || platform === "android" || platform === "web") {
    return platform;
  }

  return "unknown";
}
