type ReceivedInvitationStatus = {
  scheduledAt: string;
  canceledAt: string | null;
  myResponse: { responseStatus: "pending" | "yes" | "no" };
};

export function isPendingUpcomingInvitation(invitation: ReceivedInvitationStatus, now: Date = new Date()): boolean {
  return invitation.canceledAt === null && invitation.myResponse.responseStatus === "pending" &&
    new Date(invitation.scheduledAt).getTime() > now.getTime();
}

export function countPendingInvitations(invitations: ReceivedInvitationStatus[] | undefined, now: Date = new Date()): number {
  return invitations?.filter((invitation) => isPendingUpcomingInvitation(invitation, now)).length ?? 0;
}
