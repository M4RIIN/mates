import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  os: "ios", expoGo: false, physicalDevice: true,
  storage: new Map<string, string>(), instances: [] as unknown[],
  start: vi.fn(), update: vi.fn(), end: vi.fn(),
  getPermissions: vi.fn(), requestPermissions: vi.fn(), getToken: vi.fn(), channel: vi.fn(), handler: vi.fn()
}));

vi.mock("../../mobile/node_modules/react-native", () => ({ Platform: { get OS() { return mocks.os; } } }));
vi.mock("../../mobile/node_modules/expo", () => ({ isRunningInExpoGo: () => mocks.expoGo }));
vi.mock("../../mobile/node_modules/expo-device", () => ({ get isDevice() { return mocks.physicalDevice; } }));
vi.mock("../../mobile/node_modules/expo-constants", () => ({ default: { expoConfig: { extra: { eas: { projectId: "project-check" } } } } }));
vi.mock("../../mobile/node_modules/expo-notifications", () => ({
  getPermissionsAsync: mocks.getPermissions, requestPermissionsAsync: mocks.requestPermissions,
  getExpoPushTokenAsync: mocks.getToken, setNotificationChannelAsync: mocks.channel,
  setNotificationHandler: mocks.handler, AndroidImportance: { MAX: 5 }
}));
vi.mock("../../mobile/node_modules/@react-native-async-storage/async-storage", () => ({ default: {
  getItem: async (key: string) => mocks.storage.get(key) ?? null,
  setItem: async (key: string, value: string) => { mocks.storage.set(key, value); },
  removeItem: async (key: string) => { mocks.storage.delete(key); }
} }));
vi.mock("../../mobile/node_modules/@expo/ui/src/swift-ui/index.tsx", () => ({ ProgressView: vi.fn(), Spacer: vi.fn(), Text: vi.fn(), VStack: vi.fn(), HStack: vi.fn() }));
vi.mock("../../mobile/node_modules/@expo/ui/src/swift-ui/modifiers/index.ts", () => ({ background: vi.fn(), cornerRadius: vi.fn(), font: vi.fn(), foregroundStyle: vi.fn(), frame: vi.fn(), padding: vi.fn() }));
vi.mock("../../mobile/node_modules/expo-widgets", () => ({ createLiveActivity: () => ({
  getInstances: () => mocks.instances,
  start: (...args: unknown[]) => {
    mocks.start(...args);
    const instance = { update: mocks.update, end: async (...args: unknown[]) => {
      mocks.end(...args);
      mocks.instances = mocks.instances.filter((entry) => entry !== instance);
    } };
    mocks.instances.push(instance);
    return instance;
  }
}) }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-02T10:00:00Z"));
  mocks.os = "ios"; mocks.expoGo = false; mocks.physicalDevice = true;
  mocks.storage.clear(); mocks.instances = [];
  mocks.getPermissions.mockResolvedValue({ status: "granted" });
  mocks.requestPermissions.mockResolvedValue({ status: "granted" });
  mocks.getToken.mockResolvedValue({ data: "ExpoPushToken[test-device]" });
});

afterEach(() => vi.useRealTimers());

const invitation = {
  id: "invitation-a", creator: { id: "creator", pseudo: "creator", publicTag: "creator#1234" },
  placeName: "Café", placeAddress: null, latitude: null, longitude: null, friendGroup: null,
  scheduledAt: "2026-10-02T11:00:00Z", createdAt: "2026-10-02T10:00:00Z", canceledAt: null,
  recipients: [{ id: "recipient", user: { id: "friend", pseudo: "friend", publicTag: "friend#1234" }, responseStatus: "yes" as const, delayMinutes: null, respondedAt: null }]
};

describe("Live Activity lifecycle", () => {
  it("serializes concurrent syncs into one activity and updates its contents", async () => {
    const activities = await import("../../mobile/src/infrastructure/live-activities/invitation-live-activity");
    await Promise.all([activities.syncCreatedInvitationLiveActivity(invitation), activities.syncCreatedInvitationLiveActivity(invitation)]);
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.start).toHaveBeenCalledWith(expect.objectContaining({ statusText: "1 oui · 0 attente" }), "mates://invitations/created/invitation-a");
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("keeps the current expiry timer when another invitation is cancelled", async () => {
    const activities = await import("../../mobile/src/infrastructure/live-activities/invitation-live-activity");
    await activities.syncCreatedInvitationLiveActivity(invitation);
    await activities.endInvitationLiveActivity("invitation-b");
    expect(mocks.end).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(mocks.end).toHaveBeenCalledTimes(1);
  });

  it("starts accepted invitations and ends them on refusal", async () => {
    const activities = await import("../../mobile/src/infrastructure/live-activities/invitation-live-activity");
    await activities.syncInvitationLiveActivity(invitation, { responseStatus: "yes", delayMinutes: 10 });
    expect(mocks.start).toHaveBeenCalledWith(expect.objectContaining({ statusText: "Retard 10 min" }), "mates://invitations/received/invitation-a");
    await activities.syncInvitationLiveActivity(invitation, { responseStatus: "no", delayMinutes: null });
    expect(mocks.end).toHaveBeenCalledTimes(1);
    expect(mocks.storage.size).toBe(0);
  });

  it("does not load widget services in Expo Go", async () => {
    mocks.expoGo = true;
    const activities = await import("../../mobile/src/infrastructure/live-activities/invitation-live-activity");
    await activities.syncCreatedInvitationLiveActivity(invitation);
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.storage.size).toBe(0);
  });
});

describe("push device registration", () => {
  it("obtains an Expo token for the configured project and enables foreground alerts", async () => {
    const { getDevicePushToken } = await import("../../mobile/src/infrastructure/notifications/expo-notifications");
    await expect(getDevicePushToken()).resolves.toEqual({ token: "ExpoPushToken[test-device]", platform: "ios" });
    expect(mocks.getToken).toHaveBeenCalledWith({ projectId: "project-check" });
    const settings = await mocks.handler.mock.calls[0]?.[0].handleNotification();
    expect(settings).toMatchObject({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true });
  });

  it("creates the Android channel before requesting permission", async () => {
    mocks.os = "android";
    mocks.getPermissions.mockResolvedValue({ status: "undetermined" });
    const { getDevicePushToken } = await import("../../mobile/src/infrastructure/notifications/expo-notifications");
    await getDevicePushToken();
    expect(mocks.channel.mock.invocationCallOrder[0]).toBeLessThan(mocks.requestPermissions.mock.invocationCallOrder[0]!);
  });

  it("does not request a token after permission is denied", async () => {
    mocks.getPermissions.mockResolvedValue({ status: "denied" });
    mocks.requestPermissions.mockResolvedValue({ status: "denied" });
    const { getDevicePushToken } = await import("../../mobile/src/infrastructure/notifications/expo-notifications");
    await expect(getDevicePushToken()).resolves.toBeNull();
    expect(mocks.getToken).not.toHaveBeenCalled();
  });
});
