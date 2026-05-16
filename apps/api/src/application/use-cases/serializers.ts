import type {
  InvitationDetailsDto,
  InvitationRecipientDto,
  ReceivedInvitationDto
} from "@mates/shared";
import type {
  InvitationDetailsRecord,
  InvitationParticipantRecord,
  ReceivedInvitationRecord
} from "../ports/invitation-repository.js";

function toInvitationRecipientDto(recipient: InvitationParticipantRecord): InvitationRecipientDto {
  return {
    id: recipient.id,
    user: recipient.user,
    responseStatus: recipient.responseStatus,
    delayMinutes: recipient.delayMinutes,
    respondedAt: recipient.respondedAt?.toISOString() ?? null
  };
}

export function toInvitationDetailsDto(invitation: InvitationDetailsRecord): InvitationDetailsDto {
  return {
    id: invitation.id,
    creator: invitation.creator,
    placeName: invitation.placeName,
    placeAddress: invitation.placeAddress,
    latitude: invitation.latitude,
    longitude: invitation.longitude,
    scheduledAt: invitation.scheduledAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
    recipients: invitation.recipients.map(toInvitationRecipientDto)
  };
}

export function toReceivedInvitationDto(invitation: ReceivedInvitationRecord): ReceivedInvitationDto {
  return {
    ...toInvitationDetailsDto(invitation),
    myResponse: toInvitationRecipientDto(invitation.myResponse)
  };
}
