export const invitationHoldDurationMs = 1150;

export class InvitationSafetyGate {
  phase: "closed" | "open" | "holding" | "sending" = "closed";
  private startedAt = 0;
  open() {
    if (this.phase !== "closed") return false;
    this.phase = "open";
    return true;
  }
  beginHold(now: number) {
    if (this.phase !== "open") return false;
    this.phase = "holding";
    this.startedAt = now;
    return true;
  }
  cancelHold() {
    if (this.phase === "holding") this.phase = "open";
  }
  finishHold(now: number) {
    if (this.phase !== "holding" || now - this.startedAt < invitationHoldDurationMs) return false;
    this.phase = "sending";
    return true;
  }
  confirmAccessible() {
    if (this.phase !== "open") return false;
    this.phase = "sending";
    return true;
  }
  reset() {
    if (this.phase !== "sending") this.phase = "closed";
  }
  settle() { this.phase = "closed"; }
}

export function shouldOpenInvitationCover(distance: number, travel: number) {
  return travel > 0 && distance >= travel * 0.72;
}
