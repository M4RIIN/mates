import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Send } from "lucide-react-native";
import type { CreateInvitationRequest } from "@mates/shared";
import type { Place } from "@/domain/place/place";
import { ApiClientError } from "@/infrastructure/api/api-client";
import { buildTodayScheduledAtFromParts, getDefaultInvitationTimeParts } from "@/domain/invitation/schedule";
import { AppButton } from "@/presentation/components/AppButton";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { PlaceResultRow } from "@/presentation/components/PlaceResultRow";
import { PlaceVenuePanel } from "@/presentation/components/PlaceVenuePanel";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { useFriendGroups } from "@/presentation/hooks/useFriends";
import { useActiveCreatedInvitation, useCreateInvitation } from "@/presentation/hooks/useInvitations";
import { usePlaceSearch } from "@/presentation/hooks/usePlaceSearch";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function CreateInvitationScreen() {
  const defaultTime = getDefaultInvitationTimeParts();
  const [placeQuery, setPlaceQuery] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [hourText, setHourText] = useState(defaultTime.hour);
  const [minuteText, setMinuteText] = useState(defaultTime.minute);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedFriendGroupId, setSelectedFriendGroupId] = useState<string | null>(null);
  const activeInvitation = useActiveCreatedInvitation();
  const friendGroups = useFriendGroups();
  const placeSearch = usePlaceSearch(placeQuery);
  const createInvitation = useCreateInvitation();

  useEffect(() => {
    if (activeInvitation.data !== null && activeInvitation.data !== undefined) {
      router.replace({ pathname: "/invitations/created/[id]", params: { id: activeInvitation.data.id } });
    }
  }, [activeInvitation.data]);

  async function submit() {
    const placeName = selectedPlace?.name ?? placeQuery.trim();
    if (placeName.length === 0) {
      Alert.alert("Lieu manquant", "Choisis un lieu ou saisis un lieu custom.");
      return;
    }

    try {
      const scheduledAt = buildTodayScheduledAtFromParts(hourText, minuteText);
      const address = selectedPlace?.address ?? customAddress.trim();
      const request: CreateInvitationRequest = {
        placeName,
        scheduledAt,
        ...(address.length > 0 ? { placeAddress: address } : {}),
        ...(selectedPlace?.latitude !== null && selectedPlace?.latitude !== undefined
          ? { latitude: selectedPlace.latitude }
          : {}),
        ...(selectedPlace?.longitude !== null && selectedPlace?.longitude !== undefined
          ? { longitude: selectedPlace.longitude }
          : {}),
        ...(selectedFriendGroupId !== null ? { friendGroupId: selectedFriendGroupId } : {})
      };

      const invitation = await createInvitation.mutateAsync(request);
      router.push({ pathname: "/invitations/created/[id]", params: { id: invitation.id } });
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.code === "INVITATION_ALREADY_ACTIVE") {
        const invitationId = getInvitationIdFromError(error.details);
        if (invitationId !== undefined) {
          router.replace({ pathname: "/invitations/created/[id]", params: { id: invitationId } });
          return;
        }
      }

      Alert.alert("Invitation impossible", getErrorMessage(error));
    }
  }

  function selectPlace(place: Place) {
    setSelectedPlace(place);
    setPlaceQuery(place.name);
    setCustomAddress(place.address ?? "");
  }

  return (
    <Screen>
      {activeInvitation.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      <PageHeader eyebrow="Nouveau plan" title="Créer une invitation" subtitle="Lieu, heure, puis envoi à tes amis actifs." tone="red" compact />
      <TextField
        label="Lieu"
        value={placeQuery}
        onChangeText={(value) => {
          setPlaceQuery(value);
          setSelectedPlace(null);
        }}
        placeholder="bar, restaurant, adresse..."
      />
      {placeSearch.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {placeSearch.data !== undefined && placeSearch.data.length > 0 && selectedPlace === null ? (
        <View style={styles.results}>
          {placeSearch.data.map((place) => (
            <PlaceResultRow key={place.id} title={place.name} subtitle={place.address ?? "Lieu"} onPress={() => selectPlace(place)} />
          ))}
        </View>
      ) : null}
      {selectedPlace !== null ? (
        <PlaceVenuePanel
          title={selectedPlace.name}
          address={selectedPlace.address}
          latitude={selectedPlace.latitude}
          longitude={selectedPlace.longitude}
          showTransportActions={false}
          compact
        />
      ) : null}
      <TextField
        label="Adresse"
        value={customAddress}
        onChangeText={setCustomAddress}
        placeholder="Optionnel"
      />
      {friendGroups.data !== undefined && friendGroups.data.length > 0 ? (
        <View style={styles.results}>
          <Text style={styles.sectionLabel}>Destinataires</Text>
          <ListRow
            title="Tous mes amis actifs"
            subtitle="Invitation envoyee a tout ton reseau"
            onPress={() => setSelectedFriendGroupId(null)}
            right={<AudienceBadge active={selectedFriendGroupId === null} label="Tous" />}
          />
          {friendGroups.data.map((group) => (
            <ListRow
              key={group.id}
              title={group.name}
              subtitle={`${group.members.length} ami(s)`}
              onPress={() => setSelectedFriendGroupId(group.id)}
              right={<AudienceBadge active={selectedFriendGroupId === group.id} label="Groupe" />}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <TextField
            label="Heure"
            value={hourText}
            onChangeText={(value) => setHourText(sanitizeTimePart(value))}
            keyboardType="number-pad"
            placeholder="20"
            maxLength={2}
          />
        </View>
        <View style={styles.timeField}>
          <TextField
            label="Minute"
            value={minuteText}
            onChangeText={(value) => setMinuteText(sanitizeTimePart(value))}
            keyboardType="number-pad"
            placeholder="30"
            maxLength={2}
          />
        </View>
      </View>
      <View style={styles.buttonZone}>
        <AppButton
          title="Envoyer"
          onPress={submit}
          variant="danger"
          big
          loading={createInvitation.isPending}
          disabled={placeQuery.trim().length === 0}
          icon={<Send size={36} color={colors.white} strokeWidth={3} />}
        />
      </View>
      <Text style={styles.muted}>
        {selectedFriendGroupId === null
          ? "Envoi a tous tes amis actifs."
          : "Envoi uniquement aux amis du groupe selectionne."}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  results: {
    gap: spacing.xxs
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: spacing.xxs
  },
  timeRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  timeField: {
    flex: 1
  },
  buttonZone: {
    alignItems: "center",
    justifyContent: "center"
  },
  muted: {
    alignSelf: "center",
    color: colors.text,
    borderRadius: radii.pill,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.yellowSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontWeight: "900",
    textTransform: "uppercase",
    fontSize: 12,
    textAlign: "center",
    marginTop: -spacing.sm
  },
  badge: {
    minWidth: 74,
    textAlign: "center",
    color: colors.ink,
    fontWeight: "900",
    fontSize: 12,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderWidth: borders.regular,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface
  },
  badgeActive: {
    backgroundColor: colors.yellow
  }
});

function AudienceBadge({ active, label }: { active: boolean; label: string }) {
  return <Text style={[styles.badge, active ? styles.badgeActive : null]}>{label}</Text>;
}

function getInvitationIdFromError(details: unknown): string | undefined {
  if (typeof details !== "object" || details === null) {
    return undefined;
  }

  const invitationId = (details as { invitationId?: unknown }).invitationId;
  return typeof invitationId === "string" && invitationId.length > 0 ? invitationId : undefined;
}

function sanitizeTimePart(value: string): string {
  return value.replace(/\D+/g, "").slice(0, 2);
}
