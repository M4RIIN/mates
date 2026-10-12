import { afterEach, describe, expect, it, vi } from "vitest";
import { getInvitationState, getInvitationCoordinationEndsAt, getInvitationEstimatedArrivalAt, isInvitationOpen } from "@mates/shared";
import { InvitationSharingUseCase } from "../src/application/use-cases/invitation-sharing.use-case.js";
import type { InvitationRepository } from "../src/application/ports/invitation-repository.js";
import type { InvitationSharingRepository } from "../src/application/ports/invitation-sharing-repository.js";

afterEach(() => vi.useRealTimers());

describe("shared invitation lifecycle", () => {
  const invitation = { scheduledAt: "2026-10-11T19:00:00Z", canceledAt: null };
  it.each([
    ["2026-10-11T18:59:59Z", "upcoming", true],
    ["2026-10-11T19:00:00Z", "ongoing", true],
    ["2026-10-11T19:05:00Z", "ongoing", true],
    ["2026-10-11T20:59:59.999Z", "ongoing", true],
    ["2026-10-11T21:00:00Z", "ended", false]
  ])("uses the same open/closed boundary at %s", (time, state, open) => {
    const now = new Date(time);
    expect(getInvitationState(invitation, now)).toBe(state);
    expect(isInvitationOpen(invitation, now)).toBe(open);
    expect(getInvitationState({ ...invitation, scheduledAt: new Date(invitation.scheduledAt) }, now)).toBe(state);
  });
  it("closes cancelled invitations immediately and preserves the start", () => {
    expect(getInvitationState({ ...invitation, canceledAt: "2026-10-11T18:00:00Z" }, new Date("2026-10-11T19:05:00Z"))).toBe("cancelled");
    expect(getInvitationCoordinationEndsAt(invitation.scheduledAt).toISOString()).toBe("2026-10-11T21:00:00.000Z");
    expect(invitation.scheduledAt).toBe("2026-10-11T19:00:00Z");
  });
  it("keeps the two-hour elapsed window across midnight and a daylight saving offset change", () => {
    expect(getInvitationState({ scheduledAt: "2026-10-11T23:30:00+02:00" }, new Date("2026-10-12T00:05:00+02:00"))).toBe("ongoing");
    expect(getInvitationState({ scheduledAt: "2026-10-11T23:30:00+02:00" }, new Date("2026-10-12T01:30:00+02:00"))).toBe("ended");
    expect(getInvitationCoordinationEndsAt("2026-10-25T01:30:00+02:00").toISOString()).toBe("2026-10-25T01:30:00.000Z");
  });
  it("calculates a declared arrival from the rendezvous rather than the time of the update", () => {
    expect(getInvitationEstimatedArrivalAt(invitation.scheduledAt, 15).toISOString()).toBe("2026-10-11T19:15:00.000Z");
    expect(getInvitationEstimatedArrivalAt(invitation.scheduledAt, null).toISOString()).toBe("2026-10-11T19:00:00.000Z");
  });
});

describe("public invitation availability", () => {
  it.each([false, true])("keeps the HTTP closed field and link activation consistent (ended=%s)", async ended => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(ended ? "2026-10-11T21:00:00Z" : "2026-10-11T19:05:00Z"));
    const getDetails = vi.fn(async () => ({ id: "invitation", creatorId: "owner", creator: { pseudo: "Alex" }, placeName: "Café", placeAddress: null, scheduledAt: new Date("2026-10-11T19:00:00Z"), canceledAt: null }));
    const enable = vi.fn(async () => ({ token: "token", showAddress: false }));
    const sharing = new InvitationSharingUseCase({ getDetails } as unknown as InvitationRepository, {
      findByToken: async () => ({ invitationId: "invitation", revokedAt: null, showAddress: false }), enable
    } as unknown as InvitationSharingRepository, { publishToUsers: async () => undefined });
    expect((await sharing.getPublic("token")).closed).toBe(ended);
    if (ended) {
      await expect(sharing.enable("invitation", "owner", false)).rejects.toMatchObject({ httpStatus: 409 });
      expect(enable).not.toHaveBeenCalled();
    } else {
      await expect(sharing.enable("invitation", "owner", false)).resolves.toMatchObject({ token: "token" });
    }
  });
});
