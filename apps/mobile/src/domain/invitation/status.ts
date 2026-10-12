import { isInvitationOpen } from "@mates/shared";

type ReceivedInvitationStatus = {
  scheduledAt: string;
  canceledAt: string | null;
  myResponse: { responseStatus: "pending" | "yes" | "no" };
};

export function isPendingOpenInvitation(invitation: ReceivedInvitationStatus, now: Date = new Date()): boolean {
  return isInvitationOpen(invitation, now) && invitation.myResponse.responseStatus === "pending";
}

export function countPendingInvitations(invitations: ReceivedInvitationStatus[] | undefined, now: Date = new Date()): number {
  return invitations?.filter((invitation) => isPendingOpenInvitation(invitation, now)).length ?? 0;
}

