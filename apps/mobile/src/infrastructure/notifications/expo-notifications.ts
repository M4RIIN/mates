import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { PushPlatform } from "@mates/shared";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export type DevicePushToken = {
  token: string;
  platform: PushPlatform;
};

export async function getDevicePushToken(): Promise<DevicePushToken | null> {
  if (!Device.isDevice) {
    return null;
  }

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

  const devicePushToken = await Notifications.getDevicePushTokenAsync();

  return {
    token: String(devicePushToken.data),
    platform: toPushPlatform(Platform.OS)
  };
}

function toPushPlatform(platform: string): PushPlatform {
  if (platform === "ios" || platform === "android" || platform === "web") {
    return platform;
  }

  return "unknown";
}
