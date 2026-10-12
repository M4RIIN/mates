import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getInvitationState } from "@mates/shared";

const mocks = vi.hoisted(() => ({
  setNow: vi.fn(), remove: vi.fn(),
  onAppState: (_state: string) => {},
  cleanup: null as null | (() => void)
}));

vi.mock("../../mobile/node_modules/react", () => ({
  useState: (initial: () => Date) => [initial(), mocks.setNow],
  useEffect: (effect: () => (() => void)) => { mocks.cleanup = effect(); }
}));
vi.mock("../../mobile/node_modules/react-native", () => ({
  AppState: { addEventListener: (_event: string, callback: (state: string) => void) => {
    mocks.onAppState = callback;
    return { remove: mocks.remove };
  } }
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.cleanup = null;
  vi.setSystemTime(new Date("2026-10-11T18:59:59.980Z"));
});
afterEach(() => { mocks.cleanup?.(); vi.useRealTimers(); });

describe("invitation clock transitions", () => {
  const invitation = { scheduledAt: "2026-10-11T19:00:00Z", canceledAt: null };
  it("refreshes at the start boundary even when the screen was mounted just before it", async () => {
    const { useInvitationClock } = await import("../../mobile/src/presentation/hooks/useInvitationClock");
    expect(getInvitationState(invitation, useInvitationClock())).toBe("upcoming");
    await vi.advanceTimersByTimeAsync(20);
    expect(getInvitationState(invitation, mocks.setNow.mock.lastCall![0])).toBe("ongoing");
    expect(mocks.setNow.mock.lastCall![0].toISOString()).toBe("2026-10-11T19:00:00.000Z");
  });
  it("refreshes immediately on returning to the app after closure", async () => {
    const { useInvitationClock } = await import("../../mobile/src/presentation/hooks/useInvitationClock");
    useInvitationClock();
    mocks.onAppState("background");
    expect(mocks.setNow).not.toHaveBeenCalled();
    vi.setSystemTime(new Date("2026-10-11T21:00:00Z"));
    mocks.onAppState("active");
    expect(getInvitationState(invitation, mocks.setNow.mock.lastCall![0])).toBe("ended");
  });
  it("removes the timer and foreground listener when the screen unmounts", async () => {
    const { useInvitationClock } = await import("../../mobile/src/presentation/hooks/useInvitationClock");
    useInvitationClock();
    mocks.cleanup!(); mocks.cleanup = null;
    expect(vi.getTimerCount()).toBe(0);
    expect(mocks.remove).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(mocks.setNow).not.toHaveBeenCalled();
  });
});
