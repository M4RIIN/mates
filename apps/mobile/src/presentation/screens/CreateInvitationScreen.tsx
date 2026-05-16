import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Send } from "lucide-react-native";
import type { CreateInvitationRequest } from "@mates/shared";
import type { Place } from "@/domain/place/place";
import { buildTodayScheduledAt, getDefaultInvitationTime } from "@/domain/invitation/schedule";
import { AppButton } from "@/presentation/components/AppButton";
import { ListRow } from "@/presentation/components/ListRow";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { useCreateInvitation } from "@/presentation/hooks/useInvitations";
import { usePlaceSearch } from "@/presentation/hooks/usePlaceSearch";
import { colors, spacing } from "@/shared/theme";

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
      <Text style={styles.title}>Créer une invitation</Text>
      <TextField
        label="Lieu"
        value={placeQuery}
        onChangeText={(value) => {
          setPlaceQuery(value);
          setSelectedPlace(null);
        }}
        placeholder="bar, restaurant, adresse..."
      />
      {placeSearch.data?.map((place) => (
        <ListRow key={place.id} title={place.name} subtitle={place.address ?? "Lieu"} onPress={() => selectPlace(place)} />
      ))}
      <TextField
        label="Adresse custom"
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
          icon={<Send size={36} color="#FFFFFF" />}
        />
      </View>
      <Text style={styles.muted}>L’invitation partira à tous tes amis actifs.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900"
  },
  buttonZone: {
    alignItems: "center",
    justifyContent: "center"
  },
  muted: {
    color: colors.muted,
    textAlign: "center",
    marginTop: -spacing.md
  }
});
