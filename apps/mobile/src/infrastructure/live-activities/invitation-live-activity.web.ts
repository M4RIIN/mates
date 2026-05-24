import type { InvitationDetailsDto, InvitationRecipientDto } from "@mates/shared";

export async function syncInvitationLiveActivity(
  _invitation: InvitationDetailsDto,
  _response: Pick<InvitationRecipientDto, "responseStatus" | "delayMinutes">
) {}

export async function endInvitationLiveActivity(_invitationId?: string) {}
