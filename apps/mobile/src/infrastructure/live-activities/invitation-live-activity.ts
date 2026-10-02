import type { InvitationDetailsDto, InvitationRecipientDto } from "@mates/shared";
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

type NativeLiveActivities = typeof import("./invitation-live-activity.native-implementation");
let pendingOperation: Promise<void> = Promise.resolve();

function runOperation(operation: (liveActivities: NativeLiveActivities) => Promise<void>): Promise<void> {
  const result = pendingOperation.then(async () => {
    const liveActivities = await loadLiveActivities();
    if (liveActivities !== null) await operation(liveActivities);
  });
  // Keep start/update/end ordered even when a screen and a mutation sync together.
  pendingOperation = result.catch(() => undefined);
  return result;
}

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
  await runOperation((liveActivities) => liveActivities.syncInvitationLiveActivity(invitation, response));
}

export async function syncCreatedInvitationLiveActivity(invitation: InvitationDetailsDto) {
  await runOperation((liveActivities) => liveActivities.syncCreatedInvitationLiveActivity(invitation));
}

export async function endInvitationLiveActivity(invitationId?: string) {
  await runOperation((liveActivities) => liveActivities.endInvitationLiveActivity(invitationId));
}
