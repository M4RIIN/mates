import AsyncStorage from "@react-native-async-storage/async-storage";
import type { InvitationDetailsDto, ResponseStatus } from "@mates/shared";
import { createURL } from "expo-linking";
import { createLiveActivity } from "expo-widgets";
import { HStack, ProgressView, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import { Platform } from "react-native";

type InvitationLiveActivityProps = {
  invitationId: string;
  creatorPseudo: string;
  placeName: string;
  placeAddress: string;
  scheduledAt: string;
  responseSummary: string;
};

const ACTIVE_INVITATION_KEY = "mates-live-activity-invitation-id";
const InvitationLiveActivity = createLiveActivity<InvitationLiveActivityProps>("InvitationLiveActivity", (props) => {
  "widget";

  const scheduledDate = new Date(props.scheduledAt);
  const now = new Date();
  const address = props.placeAddress.trim().length > 0 ? props.placeAddress : "Adresse non précisée";

  return {
    banner: (
      <VStack modifiers={[padding({ all: 12 })]} spacing={8}>
        <Text modifiers={[font({ size: 18, weight: "bold" }), foregroundStyle("#071A2D")]}>
          {props.placeName}
        </Text>
        <HStack spacing={6}>
          <Text modifiers={[font({ size: 12, weight: "bold" }), foregroundStyle("#071A2D")]}>Dans</Text>
          <Text
            timerInterval={{ lower: now, upper: scheduledDate }}
            countsDown
            modifiers={[font({ size: 16, weight: "bold", design: "monospaced" }), foregroundStyle("#0057FF")]}
          />
        </HStack>
        <ProgressView timerInterval={{ lower: now, upper: scheduledDate }} countsDown />
        <Text modifiers={[font({ size: 13, weight: "medium" }), foregroundStyle("#596171")]}>
          {address}
        </Text>
        <Text modifiers={[font({ size: 12, weight: "medium" }), foregroundStyle("#596171")]}>
          {props.responseSummary}
        </Text>
      </VStack>
    ),
    compactLeading: (
      <Text modifiers={[font({ size: 13, weight: "bold" }), foregroundStyle("#071A2D")]}>M</Text>
    ),
    compactTrailing: (
      <Text
        timerInterval={{ lower: now, upper: scheduledDate }}
        countsDown
        modifiers={[font({ size: 13, weight: "bold", design: "monospaced" }), foregroundStyle("#0057FF")]}
      />
    ),
    minimal: (
      <Text modifiers={[font({ size: 13, weight: "bold" }), foregroundStyle("#0057FF")]}>⌛</Text>
    ),
    expandedLeading: (
      <VStack modifiers={[padding({ all: 12 })]} spacing={4}>
        <Text modifiers={[font({ size: 12, weight: "bold" }), foregroundStyle("#596171")]}>Invitation</Text>
        <Text modifiers={[font({ size: 18, weight: "bold" }), foregroundStyle("#071A2D")]}>
          {props.placeName}
        </Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack modifiers={[padding({ all: 12 })]} spacing={4}>
        <Text modifiers={[font({ size: 12, weight: "bold" }), foregroundStyle("#596171")]}>Rendez-vous</Text>
        <Text
          timerInterval={{ lower: now, upper: scheduledDate }}
          countsDown
          modifiers={[font({ size: 22, weight: "bold", design: "monospaced" }), foregroundStyle("#0057FF")]}
        />
      </VStack>
    ),
    expandedBottom: (
      <VStack modifiers={[padding({ all: 12 })]} spacing={6}>
        <ProgressView timerInterval={{ lower: now, upper: scheduledDate }} countsDown />
        <Text modifiers={[font({ size: 13, weight: "medium" }), foregroundStyle("#071A2D")]}>
          {address}
        </Text>
        <Text modifiers={[font({ size: 12, weight: "medium" }), foregroundStyle("#596171")]}>
          {props.responseSummary}
        </Text>
      </VStack>
    )
  };
});

export async function syncInvitationLiveActivity(
  invitation: InvitationDetailsDto,
  responseStatus: ResponseStatus | undefined,
  delayMinutes: number | null | undefined
): Promise<void> {
  if (!canUseLiveActivities()) {
    return;
  }

  if (invitation.canceledAt !== null || responseStatus === "no") {
    const activeInvitationId = await AsyncStorage.getItem(ACTIVE_INVITATION_KEY);
    if (activeInvitationId === invitation.id) {
      await endInvitationLiveActivity();
    }
    return;
  }

  if (responseStatus !== "yes") {
    return;
  }

  const props = buildLiveActivityProps(invitation, delayMinutes);
  const activeInvitationId = await AsyncStorage.getItem(ACTIVE_INVITATION_KEY);

  if (activeInvitationId === invitation.id) {
    const [instance] = InvitationLiveActivity.getInstances();
    if (instance !== undefined) {
      await instance.update(props);
      return;
    }
  }

  await endAllInvitationLiveActivities();
  InvitationLiveActivity.start(props, createURL(`/invitations/received/${invitation.id}`));
  await AsyncStorage.setItem(ACTIVE_INVITATION_KEY, invitation.id);
}

export async function endInvitationLiveActivity(): Promise<void> {
  if (!canUseLiveActivities()) {
    return;
  }

  await endAllInvitationLiveActivities();
  await AsyncStorage.removeItem(ACTIVE_INVITATION_KEY);
}

function buildLiveActivityProps(
  invitation: InvitationDetailsDto,
  delayMinutes: number | null | undefined
): InvitationLiveActivityProps {
  return {
    invitationId: invitation.id,
    creatorPseudo: invitation.creator.pseudo,
    placeName: invitation.placeName,
    placeAddress: invitation.placeAddress ?? "",
    scheduledAt: invitation.scheduledAt,
    responseSummary:
      delayMinutes === null || delayMinutes === undefined
        ? `Acceptée avec ${invitation.creator.pseudo}`
        : `Acceptée • retard estimé ${delayMinutes} min`
  };
}

async function endAllInvitationLiveActivities(): Promise<void> {
  const instances = InvitationLiveActivity.getInstances();
  await Promise.all(instances.map((instance) => instance.end("immediate", undefined, new Date())));
}

function canUseLiveActivities(): boolean {
  return Platform.OS === "ios";
}
