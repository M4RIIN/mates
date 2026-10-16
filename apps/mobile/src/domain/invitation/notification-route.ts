export function invitationNotificationRoute(type: unknown, invitationId: unknown) {
  if (typeof invitationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invitationId)) return null;
  if (type === "invitation.advance_requested") return { pathname: "/invitations/created/[id]" as const, params: { id: invitationId } };
  if (type === "invitation.created" || type === "invitation.cancelled") return { pathname: "/invitations/received/[id]" as const, params: { id: invitationId } };
  return null;
}
