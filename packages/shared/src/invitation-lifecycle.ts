export const invitationCoordinationDurationMs = 2 * 60 * 60 * 1000;

type InvitationSchedule = {
  scheduledAt: string | Date;
  canceledAt?: string | Date | null;
};

export type InvitationState = "upcoming" | "ongoing" | "ended" | "cancelled";

export function getInvitationCoordinationEndsAt(scheduledAt: string | Date): Date {
  return new Date(new Date(scheduledAt).getTime() + invitationCoordinationDurationMs);
}

export function getInvitationState(invitation: InvitationSchedule, now: Date = new Date()): InvitationState {
  if (invitation.canceledAt != null) return "cancelled";
  const start = new Date(invitation.scheduledAt).getTime();
  if (!Number.isFinite(start) || now.getTime() >= start + invitationCoordinationDurationMs) return "ended";
  return now.getTime() < start ? "upcoming" : "ongoing";
}

export function isInvitationOpen(invitation: InvitationSchedule, now: Date = new Date()): boolean {
  const state = getInvitationState(invitation, now);
  return state === "upcoming" || state === "ongoing";
}

export function getInvitationEstimatedArrivalAt(scheduledAt: string | Date, delayMinutes: number | null = 0): Date {
  return new Date(new Date(scheduledAt).getTime() + (delayMinutes ?? 0) * 60_000);
}
