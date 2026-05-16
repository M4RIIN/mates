import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { Screen } from "@/presentation/components/Screen";
import { useInvitationDetails } from "@/presentation/hooks/useInvitations";
import { useRouteId } from "@/presentation/hooks/useRouteId";
import { formatDateTime } from "@/shared/date-format";
import { colors, spacing } from "@/shared/theme";

export function CreatedInvitationDetailScreen() {
  const id = useRouteId();
  const invitation = useInvitationDetails(id);
  const recipients = invitation.data?.recipients ?? [];
  const yesCount = recipients.filter((recipient) => recipient.responseStatus === "yes").length;
  const noCount = recipients.filter((recipient) => recipient.responseStatus === "no").length;
  const pendingCount = recipients.filter((recipient) => recipient.responseStatus === "pending").length;

  return (
    <Screen>
      {invitation.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {invitation.data !== undefined ? (
        <>
          <Text style={styles.title}>{invitation.data.placeName}</Text>
          <Text style={styles.subtitle}>{formatDateTime(invitation.data.scheduledAt)}</Text>
          {invitation.data.placeAddress !== null ? <Text style={styles.address}>{invitation.data.placeAddress}</Text> : null}
          <View style={styles.stats}>
            <Text style={styles.stat}>Oui {yesCount}</Text>
            <Text style={styles.stat}>Non {noCount}</Text>
            <Text style={styles.stat}>Attente {pendingCount}</Text>
          </View>
          {recipients.length === 0 ? (
            <EmptyState title="Aucun destinataire" subtitle="Ajoute des amis actifs avant la prochaine invitation." />
          ) : null}
          {recipients.map((recipient) => (
            <ListRow
              key={recipient.id}
              title={recipient.user.pseudo}
              subtitle={formatRecipientStatus(recipient.responseStatus, recipient.delayMinutes)}
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function formatRecipientStatus(status: "pending" | "yes" | "no", delayMinutes: number | null): string {
  if (status === "pending") {
    return "Pas encore répondu";
  }

  if (status === "no") {
    return "Non";
  }

  return delayMinutes === null ? "Oui" : `Oui · retard ${delayMinutes} min`;
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "700"
  },
  address: {
    color: colors.muted
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm
  },
  stat: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    color: colors.text,
    fontWeight: "800",
    textAlign: "center"
  }
});
