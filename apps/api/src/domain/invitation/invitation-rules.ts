import { AppErrors } from "../shared/app-error.js";
import { isSameLocalDay } from "../shared/date.js";

export type InvitationReplyStatus = "yes" | "no";

export function assertInvitationScheduledToday(scheduledAt: Date, now: Date = new Date()): void {
  if (Number.isNaN(scheduledAt.getTime())) {
    throw AppErrors.validation("scheduledAt must be a valid ISO date");
  }

  if (!isSameLocalDay(scheduledAt, now)) {
    throw AppErrors.invitationDateNotToday();
  }
}

export type NormalizedInvitationResponse = {
  responseStatus: InvitationReplyStatus;
  delayMinutes: number | null;
  respondedAt: Date;
};

export function normalizeInvitationResponse(
  status: InvitationReplyStatus,
  delayMinutes: number | null | undefined,
  now: Date = new Date()
): NormalizedInvitationResponse {
  if (status === "no") {
    if (delayMinutes !== null && delayMinutes !== undefined) {
      throw AppErrors.invalidInvitationResponse("Delay is not allowed when the answer is no");
    }

    return {
      responseStatus: "no",
      delayMinutes: null,
      respondedAt: now
    };
  }

  if (delayMinutes !== null && delayMinutes !== undefined) {
    if (!Number.isInteger(delayMinutes) || delayMinutes < 0 || delayMinutes > 24 * 60) {
      throw AppErrors.invalidInvitationResponse("Delay must be a positive amount of minutes");
    }
  }

  return {
    responseStatus: "yes",
    delayMinutes: delayMinutes ?? null,
    respondedAt: now
  };
}
