import AsyncStorage from "@react-native-async-storage/async-storage";
import type { InvitationDetailsDto, InvitationRecipientDto } from "@mates/shared";
import { Button, ProgressView, Spacer, Text, VStack, HStack } from "@expo/ui/swift-ui";
import { background, cornerRadius, font, foregroundStyle, frame, padding } from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";
import { Platform } from "react-native";

type InvitationLiveActivityProps = {
  invitationId: string;
  placeName: string;
  placeAddress: string;
  scheduledAt: number;
  progressStartedAt: number;
  statusText: string;
};

const LIVE_ACTIVITY_STORAGE_KEY = "mates.live-activity.invitation-id";
const LIVE_ACTIVITY_PROGRESS_STORAGE_KEY = "mates.live-activity.progress-started-at";
let autoEndTimeout: ReturnType<typeof setTimeout> | null = null;

const InvitationActivityLayout = (props: InvitationLiveActivityProps, environment: LiveActivityEnvironment) => {
  "widget";

  const now = new Date();
  const scheduledAt = new Date(props.scheduledAt);
  const progressStartedAt = new Date(props.progressStartedAt);
  const countdownLower = now.getTime() < scheduledAt.getTime() ? now : scheduledAt;
  const hasStarted = scheduledAt.getTime() <= now.getTime();
  const scheduledTimeLabel = scheduledAt.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const timer = hasStarted ? (
    <Text modifiers={[font({ size: 20, weight: "bold" }), foregroundStyle("#0F172A")]}>En cours</Text>
  ) : (
    <Text
      timerInterval={{ lower: countdownLower, upper: scheduledAt }}
      countsDown
      modifiers={[font({ size: 20, weight: "bold" }), foregroundStyle("#0F172A")]}
    />
  );

  return {
    banner: (
      <VStack
        modifiers={[
          padding({ all: 14 }),
          background("#F8FAFC"),
          cornerRadius(18)
        ]}
      >
        <HStack>
          <VStack modifiers={[frame({ maxWidth: 220, alignment: "leading" })]}>
            <Text modifiers={[font({ size: 17, weight: "bold" }), foregroundStyle("#0F172A")]}>
              {props.placeName}
            </Text>
            <Text modifiers={[font({ size: 12 }), foregroundStyle("#475569")]}>{props.placeAddress}</Text>
          </VStack>
          <Spacer />
          <VStack modifiers={[frame({ alignment: "trailing" })]}>
            <Text modifiers={[font({ size: 12, weight: "bold" }), foregroundStyle("#475569")]}>RDV</Text>
            <Text modifiers={[font({ size: 16, weight: "bold" }), foregroundStyle("#0F172A")]}>
              {scheduledTimeLabel}
            </Text>
          </VStack>
        </HStack>
        <ProgressView timerInterval={{ lower: progressStartedAt, upper: scheduledAt }} />
        <HStack>
          {timer}
          <Spacer />
          <Text modifiers={[font({ size: 12, weight: "bold" }), foregroundStyle("#1D4ED8")]}>
            {props.statusText}
          </Text>
        </HStack>
        <HStack>
          <Spacer />
          <Button
            label="Itinéraire"
            target={buildInvitationDirectionsTarget(props.invitationId)}
            onPress={() => undefined}
            modifiers={[
              font({ size: 12, weight: "bold" }),
              foregroundStyle("#1D4ED8"),
              background("#DBEAFE"),
              cornerRadius(999),
              padding({ horizontal: 10, vertical: 6 })
            ]}
          />
        </HStack>
      </VStack>
    ),
    compactLeading: (
      <Text modifiers={[font({ size: 12, weight: "bold" }), foregroundStyle("#0F172A")]}>Mates</Text>
    ),
    compactTrailing: timer,
    minimal: (
      <Text modifiers={[font({ size: 12, weight: "bold" }), foregroundStyle("#0F172A")]}>M</Text>
    ),
    expandedLeading: (
      <VStack>
        <Text modifiers={[font({ size: 16, weight: "bold" }), foregroundStyle("#0F172A")]}>
          {props.placeName}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle("#475569")]}>{props.placeAddress}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack modifiers={[frame({ alignment: "trailing" })]}>
        <Text modifiers={[font({ size: 12, weight: "bold" }), foregroundStyle("#475569")]}>RDV</Text>
        <Text modifiers={[font({ size: 18, weight: "bold" }), foregroundStyle("#0F172A")]}>
          {scheduledTimeLabel}
        </Text>
      </VStack>
    ),
    expandedCenter: timer,
    expandedBottom: (
      <HStack modifiers={[padding({ horizontal: 12, bottom: 12 })]}>
        <Text modifiers={[font({ size: 12, weight: "bold" }), foregroundStyle("#1D4ED8")]}>
          {props.statusText}
        </Text>
        <Spacer />
          <Button
            label="Itinéraire"
            target={buildInvitationDirectionsTarget(props.invitationId)}
            onPress={() => undefined}
            modifiers={[
              font({ size: 12, weight: "bold" }),
              foregroundStyle("#1D4ED8"),
            background("#DBEAFE"),
            cornerRadius(999),
            padding({ horizontal: 10, vertical: 6 })
          ]}
        />
      </HStack>
    )
  };
};

const InvitationActivity = createLiveActivity("InvitationActivity", InvitationActivityLayout);

export async function syncInvitationLiveActivity(
  invitation: InvitationDetailsDto,
  response: Pick<InvitationRecipientDto, "responseStatus" | "delayMinutes">
) {
  if (Platform.OS !== "ios") {
    return;
  }

  const scheduledAtMs = new Date(invitation.scheduledAt).getTime();

  if (response.responseStatus !== "yes" || invitation.canceledAt !== null || scheduledAtMs <= Date.now()) {
    await endInvitationLiveActivity(invitation.id);
    return;
  }

  const currentInvitationId = await AsyncStorage.getItem(LIVE_ACTIVITY_STORAGE_KEY);
  const storedProgressStartedAt = await AsyncStorage.getItem(LIVE_ACTIVITY_PROGRESS_STORAGE_KEY);
  const instances = InvitationActivity.getInstances();
  const progressStartedAt =
    currentInvitationId === invitation.id && storedProgressStartedAt !== null
      ? Number.parseInt(storedProgressStartedAt, 10)
      : Date.now();
  const props = buildLiveActivityProps(invitation, response.delayMinutes, progressStartedAt);

  if (currentInvitationId !== null && currentInvitationId !== invitation.id) {
    await Promise.all(instances.map((instance) => instance.end("immediate", undefined, new Date())));
  }

  if (currentInvitationId === invitation.id && instances.length > 0) {
    await Promise.all(instances.map((instance, index) => (index === 0 ? instance.update(props) : instance.end("immediate"))));
    await AsyncStorage.setItem(LIVE_ACTIVITY_STORAGE_KEY, invitation.id);
    await AsyncStorage.setItem(LIVE_ACTIVITY_PROGRESS_STORAGE_KEY, String(progressStartedAt));
    scheduleInvitationLiveActivityEnd(invitation.id, scheduledAtMs);
    return;
  }

  InvitationActivity.start(props, buildInvitationUrl(invitation.id));
  await AsyncStorage.setItem(LIVE_ACTIVITY_STORAGE_KEY, invitation.id);
  await AsyncStorage.setItem(LIVE_ACTIVITY_PROGRESS_STORAGE_KEY, String(progressStartedAt));
  scheduleInvitationLiveActivityEnd(invitation.id, scheduledAtMs);
}

export async function endInvitationLiveActivity(invitationId?: string) {
  if (Platform.OS !== "ios") {
    return;
  }

  clearInvitationLiveActivityEndTimer();

  const currentInvitationId = await AsyncStorage.getItem(LIVE_ACTIVITY_STORAGE_KEY);
  if (invitationId !== undefined && currentInvitationId !== invitationId) {
    return;
  }

  const instances = InvitationActivity.getInstances();
  await Promise.all(instances.map((instance) => instance.end("immediate", undefined, new Date())));
  await AsyncStorage.removeItem(LIVE_ACTIVITY_STORAGE_KEY);
  await AsyncStorage.removeItem(LIVE_ACTIVITY_PROGRESS_STORAGE_KEY);
}

function buildLiveActivityProps(
  invitation: InvitationDetailsDto,
  delayMinutes: number | null,
  progressStartedAt: number
): InvitationLiveActivityProps {
  return {
    invitationId: invitation.id,
    placeName: invitation.placeName,
    placeAddress: invitation.placeAddress ?? "Adresse indisponible",
    scheduledAt: new Date(invitation.scheduledAt).getTime(),
    progressStartedAt,
    statusText: delayMinutes === null ? "Tu y vas" : `Retard ${delayMinutes} min`
  };
}

function buildInvitationUrl(invitationId: string) {
  return `mates://invitations/received/${invitationId}`;
}

function buildInvitationDirectionsTarget(invitationId: string) {
  return `invitation-directions:${invitationId}`;
}

function scheduleInvitationLiveActivityEnd(invitationId: string, scheduledAtMs: number) {
  clearInvitationLiveActivityEndTimer();

  const delayMs = scheduledAtMs - Date.now();
  if (delayMs <= 0) {
    endInvitationLiveActivity(invitationId).catch((error: unknown) => {
      console.warn("Failed to end invitation live activity", error);
    });
    return;
  }

  autoEndTimeout = setTimeout(() => {
    autoEndTimeout = null;
    endInvitationLiveActivity(invitationId).catch((error: unknown) => {
      console.warn("Failed to end invitation live activity", error);
    });
  }, delayMs);
}

function clearInvitationLiveActivityEndTimer() {
  if (autoEndTimeout !== null) {
    clearTimeout(autoEndTimeout);
    autoEndTimeout = null;
  }
}
