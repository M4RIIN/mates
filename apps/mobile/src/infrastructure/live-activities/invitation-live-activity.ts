import type { InvitationDetailsDto, InvitationRecipientDto } from "@mates/shared";
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

// expo-widgets is absent from Expo Go. Load it only in an iOS native build.
async function loadLiveActivities() {
  if (Platform.OS !== "ios" || isRunningInExpoGo()) {
    return null;
  }

  return import("./invitation-live-activity.native-implementation");
}

export async function syncInvitationLiveActivity(
  invitation: InvitationDetailsDto,
  response: Pick<InvitationRecipientDto, "responseStatus" | "delayMinutes">
) {
  const liveActivities = await loadLiveActivities();
  await liveActivities?.syncInvitationLiveActivity(invitation, response);
}

export async function syncCreatedInvitationLiveActivity(invitation: InvitationDetailsDto) {
  const liveActivities = await loadLiveActivities();
  await liveActivities?.syncCreatedInvitationLiveActivity(invitation);
}

export async function endInvitationLiveActivity(invitationId?: string) {
  const liveActivities = await loadLiveActivities();
  await liveActivities?.endInvitationLiveActivity(invitationId);
}
