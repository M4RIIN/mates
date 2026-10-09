import { describe, expect, it } from "vitest";
import { countPendingInvitations } from "../../mobile/src/domain/invitation/status.js";

describe("invitations awaiting a response badge", () => {
  const now = new Date("2026-10-09T12:00:00Z");
  const invitation = { scheduledAt: "2026-10-09T13:00:00Z", canceledAt: null,
    myResponse: { responseStatus: "pending" as const } };

  it("counts only future, uncanceled invitations without a response", () => {
    expect(countPendingInvitations([
      invitation,
      { ...invitation, myResponse: { responseStatus: "yes" } },
      { ...invitation, myResponse: { responseStatus: "no" } },
      { ...invitation, canceledAt: "2026-10-09T11:00:00Z" },
      { ...invitation, scheduledAt: "2026-10-09T11:00:00Z" },
      { ...invitation, scheduledAt: now.toISOString() }
    ], now)).toBe(1);
  });

  it("clears the badge when time passes without another API response", () => {
    expect(countPendingInvitations([invitation], now)).toBe(1);
    expect(countPendingInvitations([invitation], new Date("2026-10-09T14:00:00Z"))).toBe(0);
  });

  it("has no badge while loading or for an empty list", () => {
    expect(countPendingInvitations(undefined, now)).toBe(0);
    expect(countPendingInvitations([], now)).toBe(0);
  });
});
