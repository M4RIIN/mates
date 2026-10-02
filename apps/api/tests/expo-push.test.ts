import { afterEach, describe, expect, it, vi } from "vitest";
import { ExpoPushNotificationGateway } from "../src/infrastructure/notifications/expo-push-notification.gateway.js";
import type { PushTokenRecord } from "../src/application/ports/push-token-repository.js";

const token = (value: string): PushTokenRecord => ({ id: value, userId: "recipient", token: value, platform: "ios", createdAt: new Date() });
const invitation = { invitationId: "invitation-check", creatorPseudo: "nicolas", placeName: "Café", scheduledAt: new Date("2026-10-02T18:00:00Z") };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Expo push delivery requests", () => {
  it("sends a notification with the destination invitation and excludes non-Expo tokens", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ status: "ok", id: "ticket-check" }] })));
    vi.stubGlobal("fetch", fetch);
    await new ExpoPushNotificationGateway().sendInvitationCreated([token("ExpoPushToken[device-check]"), token("firebase-token")], invitation);
    const messages = JSON.parse(fetch.mock.calls[0]?.[1].body);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ to: "ExpoPushToken[device-check]", sound: "default", data: { type: "invitation.created", invitationId: invitation.invitationId } });
  });

  it("splits notification batches at the Expo limit of 100", async () => {
    const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ data: [] })));
    vi.stubGlobal("fetch", fetch);
    await new ExpoPushNotificationGateway().sendInvitationCreated(Array.from({ length: 101 }, (_, index) => token(`ExpoPushToken[device-${index}]`)), invitation);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[0]?.[1].body)).toHaveLength(100);
    expect(JSON.parse(fetch.mock.calls[1]?.[1].body)).toHaveLength(1);
  });

  it("reports rejection of an unregistered device", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ status: "error", message: "Device is unregistered", details: { error: "DeviceNotRegistered" } }] }))));
    await new ExpoPushNotificationGateway().sendInvitationCancelled([token("ExpoPushToken[device-check]")], invitation);
    expect(warn).toHaveBeenCalledWith("Expo push ticket error", expect.objectContaining({ code: "DeviceNotRegistered" }));
  });

  it("surfaces an Expo HTTP failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Service unavailable", { status: 503 })));
    await expect(new ExpoPushNotificationGateway().sendInvitationCreated([token("ExpoPushToken[device-check]")], invitation)).rejects.toThrow("status 503");
  });
});
