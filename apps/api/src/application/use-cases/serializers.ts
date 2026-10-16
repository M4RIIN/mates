import { toGuestResponseDto } from "./invitation-sharing.use-case.js";
import type {
  AuthResponse,
  CurrentUserDto,
  InvitationDetailsDto,
  InvitationRecipientDto,
  ReceivedInvitationDto
} from "@mates/shared";
import type {
  InvitationDetailsRecord,
  InvitationParticipantRecord,
  ReceivedInvitationRecord
} from "../ports/invitation-repository.js";
import type { UserRecord } from "../ports/user-repository.js";

export function toAuthResponse(user: UserRecord, token: string): AuthResponse {
  return {
    token,
    user: toCurrentUserDto(user)
  };
}

export function toCurrentUserDto(user: UserRecord): CurrentUserDto {
  return {
    id: user.id,
    pseudo: user.pseudo,
    publicTag: user.publicTag,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString()
  };
}

function toInvitationRecipientDto(recipient: InvitationParticipantRecord, includeAdvanceRequest = true): InvitationRecipientDto {
  return {
    id: recipient.id,
    user: recipient.user,
    responseStatus: recipient.responseStatus,
    delayMinutes: recipient.delayMinutes,
    advanceRequest: includeAdvanceRequest ? recipient.advanceRequest ?? null : null,
    respondedAt: recipient.respondedAt?.toISOString() ?? null
  };
}

export function toInvitationDetailsDto(invitation: InvitationDetailsRecord, viewerId = invitation.creator.id): InvitationDetailsDto {
  return {
    id: invitation.id,
    creator: invitation.creator,
    friendGroup: invitation.friendGroup,
    placeName: invitation.placeName,
    placeAddress: invitation.placeAddress,
    latitude: invitation.latitude,
    longitude: invitation.longitude,
    scheduledAt: invitation.scheduledAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
    canceledAt: invitation.canceledAt?.toISOString() ?? null,
    guestResponses: (invitation.guestResponses ?? []).map(toGuestResponseDto),
    recipients: invitation.recipients.map(recipient => toInvitationRecipientDto(recipient, viewerId === invitation.creator.id || viewerId === recipient.user.id))
  };
}

export function toReceivedInvitationDto(invitation: ReceivedInvitationRecord): ReceivedInvitationDto {
  return {
    ...toInvitationDetailsDto({ ...invitation, guestResponses: [] }, invitation.myResponse.user.id),
    myResponse: toInvitationRecipientDto(invitation.myResponse)
  };
}
