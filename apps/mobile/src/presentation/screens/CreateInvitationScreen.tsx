import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Send } from "lucide-react-native";
import type { CreateInvitationRequest } from "@mates/shared";
import type { Place } from "@/domain/place/place";
import { buildTodayScheduledAt, getDefaultInvitationTime } from "@/domain/invitation/schedule";
import { AppButton } from "@/presentation/components/AppButton";
import { PageHeader } from "@/presentation/components/PageHeader";
import { PlaceResultRow } from "@/presentation/components/PlaceResultRow";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { useCreateInvitation } from "@/presentation/hooks/useInvitations";
import { usePlaceSearch } from "@/presentation/hooks/usePlaceSearch";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function CreateInvitationScreen() {
  const [placeQuery, setPlaceQuery] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [timeText, setTimeText] = useState(getDefaultInvitationTime());
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const placeSearch = usePlaceSearch(placeQuery);
  const createInvitation = useCreateInvitation();

  async function submit() {
    const placeName = selectedPlace?.name ?? placeQuery.trim();
    if (placeName.length === 0) {
      Alert.alert("Lieu manquant", "Choisis un lieu ou saisis un lieu custom.");
      return;
    }

    try {
      const scheduledAt = buildTodayScheduledAt(timeText);
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
          : {})
      };

      const invitation = await createInvitation.mutateAsync(request);
      router.push({ pathname: "/invitations/created/[id]", params: { id: invitation.id } });
    } catch (error: unknown) {
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
      <TextField
        label="Adresse"
        value={customAddress}
        onChangeText={setCustomAddress}
        placeholder="Optionnel"
      />
      <TextField label="Heure aujourd’hui" value={timeText} onChangeText={setTimeText} placeholder="20:30" />
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
      <Text style={styles.muted}>Envoi à tous tes amis actifs.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  results: {
    gap: spacing.xxs
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
  }
});
