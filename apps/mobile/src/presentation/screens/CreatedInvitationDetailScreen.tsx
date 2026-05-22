import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { PlaceVenuePanel } from "@/presentation/components/PlaceVenuePanel";
import { Screen } from "@/presentation/components/Screen";
import { useInvitationDetails } from "@/presentation/hooks/useInvitations";
import { useRouteId } from "@/presentation/hooks/useRouteId";
import { formatDateTime } from "@/shared/date-format";
import { borders, colors, radii, spacing } from "@/shared/theme";

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
          <PageHeader
            eyebrow="Invitation créée"
            title={invitation.data.placeName}
            subtitle={formatDateTime(invitation.data.scheduledAt)}
            tone="red"
            compact
          />
          <PlaceVenuePanel
            title={invitation.data.placeName}
            address={invitation.data.placeAddress}
            latitude={invitation.data.latitude}
            longitude={invitation.data.longitude}
            showReserveButton
          />
          <View style={styles.stats}>
            <View style={[styles.stat, styles.statYes]}>
              <Text style={styles.statNumber}>{yesCount}</Text>
              <Text style={styles.statLabel}>Oui</Text>
            </View>
            <View style={[styles.stat, styles.statNo]}>
              <Text style={[styles.statNumber, styles.statTextLight]}>{noCount}</Text>
              <Text style={[styles.statLabel, styles.statTextLight]}>Non</Text>
            </View>
            <View style={[styles.stat, styles.statPending]}>
              <Text style={[styles.statNumber, styles.statTextLight]}>{pendingCount}</Text>
              <Text style={[styles.statLabel, styles.statTextLight]}>Attente</Text>
            </View>
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
  stats: {
    flexDirection: "row",
    gap: spacing.sm
  },
  stat: {
    flex: 1,
    minHeight: 88,
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    padding: spacing.sm,
    justifyContent: "space-between"
  },
  statYes: {
    backgroundColor: colors.yellow
  },
  statNo: {
    backgroundColor: colors.red
  },
  statPending: {
    backgroundColor: colors.primary
  },
  statNumber: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  statTextLight: {
    color: colors.white
  }
});
