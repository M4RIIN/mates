import { useState } from "react";
import { Alert, ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Check, Clock3, X } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { PageHeader } from "@/presentation/components/PageHeader";
import { PlaceVenuePanel } from "@/presentation/components/PlaceVenuePanel";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { useInvitationDetails, useRespondToInvitation } from "@/presentation/hooks/useInvitations";
import { useRouteId } from "@/presentation/hooks/useRouteId";
import { useAuthStore } from "@/infrastructure/storage/auth-store";
import { formatDateTime } from "@/shared/date-format";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function RespondInvitationScreen() {
  const id = useRouteId();
  const user = useAuthStore((state) => state.user);
  const [delayText, setDelayText] = useState("10");
  const invitation = useInvitationDetails(id);
  const respond = useRespondToInvitation(id ?? "");
  const myResponse = invitation.data?.recipients.find((recipient) => recipient.user.id === user?.id);

  async function answerYes(delayMinutes?: number) {
    if (id === undefined) {
      return;
    }

    try {
      await respond.mutateAsync(delayMinutes === undefined ? { status: "yes" } : { status: "yes", delayMinutes });
      router.back();
    } catch (error: unknown) {
      Alert.alert("Réponse impossible", getErrorMessage(error));
    }
  }

  async function answerNo() {
    if (id === undefined) {
      return;
    }

    try {
      await respond.mutateAsync({ status: "no" });
      router.back();
    } catch (error: unknown) {
      Alert.alert("Réponse impossible", getErrorMessage(error));
    }
  }

  function answerWithDelay() {
    const delayMinutes = Number.parseInt(delayText, 10);
    if (!Number.isInteger(delayMinutes) || delayMinutes < 0) {
      Alert.alert("Retard invalide", "Entre un nombre de minutes positif.");
      return;
    }

    answerYes(delayMinutes).catch((error: unknown) => {
      Alert.alert("Réponse impossible", getErrorMessage(error));
    });
  }

  return (
    <Screen>
      {invitation.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {invitation.data !== undefined ? (
        <>
          <PageHeader
            eyebrow={`De ${invitation.data.creator.pseudo}`}
            title={invitation.data.placeName}
            subtitle={formatDateTime(invitation.data.scheduledAt)}
            tone="blue"
            compact
          />
          <PlaceVenuePanel
            title={invitation.data.placeName}
            address={invitation.data.placeAddress}
            latitude={invitation.data.latitude}
            longitude={invitation.data.longitude}
          />
          <View style={styles.current}>
            <Text style={styles.currentLabel}>Ta réponse</Text>
            <Text style={styles.currentValue}>{formatCurrentResponse(myResponse?.responseStatus, myResponse?.delayMinutes)}</Text>
          </View>
          <View style={styles.answerRow}>
            <View style={styles.answerItem}>
              <AppButton
                title="Oui"
                onPress={() => {
                  answerYes().catch((error: unknown) => {
                    Alert.alert("Réponse impossible", getErrorMessage(error));
                  });
                }}
                loading={respond.isPending}
                variant="success"
                icon={<Check size={18} color={colors.ink} strokeWidth={3} />}
              />
            </View>
            <View style={styles.answerItem}>
              <AppButton
                title="Non"
                onPress={answerNo}
                loading={respond.isPending}
                variant="danger"
                icon={<X size={18} color={colors.white} strokeWidth={3} />}
              />
            </View>
          </View>
          <View style={styles.delayRow}>
            <View style={styles.delayField}>
              <TextField label="Retard estimé" value={delayText} onChangeText={setDelayText} keyboardType="number-pad" placeholder="10" />
            </View>
            <View style={styles.delayButton}>
              <AppButton
                title="Oui + retard"
                onPress={answerWithDelay}
                loading={respond.isPending}
                icon={<Clock3 size={18} color={colors.white} strokeWidth={3} />}
              />
            </View>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function formatCurrentResponse(status: "pending" | "yes" | "no" | undefined, delayMinutes: number | null | undefined): string {
  if (status === "yes") {
    return delayMinutes === null || delayMinutes === undefined ? "Oui" : `Oui, retard ${delayMinutes} min`;
  }

  if (status === "no") {
    return "Non";
  }

  return "Pas encore répondu";
}

const styles = StyleSheet.create({
  current: {
    borderRadius: radii.md,
    backgroundColor: colors.blueSoft,
    borderWidth: borders.regular,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs
  },
  currentLabel: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  currentValue: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900"
  },
  answerRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  answerItem: {
    flex: 1
  },
  delayRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-end"
  },
  delayField: {
    flex: 1
  },
  delayButton: {
    flex: 1
  }
});
