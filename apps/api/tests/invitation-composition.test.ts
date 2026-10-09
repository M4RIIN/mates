import { describe, expect, it } from "vitest";
import { buildInvitationPlaceInput } from "../../mobile/src/domain/invitation/place-input.js";
import { buildTodayScheduledAtFromParts, getDefaultInvitationTime, getInvitationTimeError } from "../../mobile/src/domain/invitation/schedule.js";

describe("invitation composition", () => {
  const place = { id: "cafe", name: "Café", address: "10 rue A", latitude: 48.8, longitude: 2.3 };
  it("sends the corrected address without the original map coordinates", () => {
    expect(buildInvitationPlaceInput(place, "Café", " 20 rue B ")).toEqual({ placeName: "Café", placeAddress: "20 rue B" });
    expect(buildInvitationPlaceInput(place, "Café", "10 rue A")).toMatchObject({ latitude: 48.8, longitude: 2.3 });
    expect(buildInvitationPlaceInput(place, "Café", "")).toEqual({ placeName: "Café" });
  });
  it("allows a free place and optional address", () => {
    expect(buildInvitationPlaceInput(null, " Chez moi ", "")).toEqual({ placeName: "Chez moi" });
  });
  it("rejects malformed, passed and elapsed times before sending", () => {
    const now = new Date(2026, 9, 9, 18, 30);
    expect(getInvitationTimeError("18", "31", now)).toBeNull();
    expect(getInvitationTimeError("18", "30", now)).not.toBeNull();
    expect(getInvitationTimeError("18", "31", new Date(2026, 9, 9, 18, 32))).not.toBeNull();
    expect(() => buildTodayScheduledAtFromParts("18abc", "30", now)).toThrow();
    expect(() => buildTodayScheduledAtFromParts("18", "60", now)).toThrow();
  });
  it("keeps the default on today at the end of the day", () => {
    const now = new Date(2026, 9, 9, 23, 20);
    expect(getDefaultInvitationTime(now)).toBe("23:59");
    expect(new Date(buildTodayScheduledAtFromParts("23", "59", now)).getDate()).toBe(now.getDate());
    expect(getInvitationTimeError("23", "59", new Date(2026, 9, 9, 23, 59, 30))).not.toBeNull();
  });
});
