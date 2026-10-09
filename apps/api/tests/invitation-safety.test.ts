import { describe, expect, it } from "vitest";
import { InvitationSafetyGate, shouldOpenInvitationCover } from "../../mobile/src/domain/invitation/safety-gate.js";

describe("protected invitation sending", () => {
  it("requires opening and the whole 1150 ms hold", () => {
    const gate = new InvitationSafetyGate();
    expect(gate.beginHold(0)).toBe(false);
    expect(gate.confirmAccessible()).toBe(false);
    gate.open();
    expect(gate.beginHold(100)).toBe(true);
    expect(gate.finishHold(1249)).toBe(false);
    expect(gate.finishHold(1250)).toBe(true);
  });
  it("cancels a released or interrupted hold without sending", () => {
    const gate = new InvitationSafetyGate();
    gate.open(); gate.beginHold(100); gate.cancelHold();
    expect(gate.finishHold(1250)).toBe(false);
    gate.beginHold(2000); gate.reset();
    expect(gate.finishHold(4000)).toBe(false);
    expect(gate.phase).toBe("closed");
  });
  it("blocks repeated sending and reopening until the request settles", () => {
    const gate = new InvitationSafetyGate();
    gate.open(); gate.beginHold(0); gate.finishHold(1150);
    gate.reset();
    expect(gate.open()).toBe(false);
    expect(gate.beginHold(2000)).toBe(false);
    expect(gate.finishHold(4000)).toBe(false);
    expect(gate.confirmAccessible()).toBe(false);
    gate.settle();
    expect(gate.beginHold(5000)).toBe(false);
    expect(gate.open()).toBe(true);
  });
  it("keeps an incomplete or reverse slide closed", () => {
    expect(shouldOpenInvitationCover(71, 100)).toBe(false);
    expect(shouldOpenInvitationCover(72, 100)).toBe(true);
    expect(shouldOpenInvitationCover(-100, 100)).toBe(false);
  });
  it("requires the open cover before explicit accessible confirmation", () => {
    const gate = new InvitationSafetyGate();
    gate.open(); expect(gate.confirmAccessible()).toBe(true);
    expect(gate.confirmAccessible()).toBe(false);
  });
});
