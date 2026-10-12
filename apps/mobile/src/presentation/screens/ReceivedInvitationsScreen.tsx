import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { getInvitationState, isInvitationOpen } from "@mates/shared";
import { useInvitationClock } from "@/presentation/hooks/useInvitationClock";
import { router } from "expo-router";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { useReceivedInvitations } from "@/presentation/hooks/useInvitations";
import { formatDateTime } from "@/shared/date-format";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function ReceivedInvitationsScreen() {
  const invitations = useReceivedInvitations();
  const now = useInvitationClock();
  const upcomingInvitations = [...(invitations.data ?? [])]
    .filter((invitation) => getInvitationState(invitation, now) === "upcoming")
    .sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());
  const pastInvitations = [...(invitations.data ?? [])]
    .filter((invitation) => !isInvitationOpen(invitation, now))
    .sort((left, right) => new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime());
  const ongoingInvitations = (invitations.data ?? []).filter((invitation) => getInvitationState(invitation, now) === "ongoing");

  return (
    <Screen>
      <PageHeader
        eyebrow="Inbox"
        title="Reçues"
        subtitle={invitations.data !== undefined ? `${invitations.data.length} invitation(s)` : "Chargement"}
        tone="blue"
        compact
      />
      {invitations.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {invitations.data?.length === 0 ? <EmptyState title="Aucune invitation reçue" /> : null}
      {ongoingInvitations.length > 0 ? <InvitationSection title="En cours" invitations={ongoingInvitations} /> : null}
      {upcomingInvitations.length > 0 ? (
        <InvitationSection
          title="À venir"
          invitations={upcomingInvitations}
        />
      ) : null}
      {pastInvitations.length > 0 ? (
        <InvitationSection
          title="Terminées ou annulées"
          invitations={pastInvitations}
        />
      ) : null}
    </Screen>
  );
}

function InvitationSection({
  title,
  invitations
}: {
  title: string;
  invitations: Array<{
    id: string;
    placeName: string;
    scheduledAt: string;
    creator: { pseudo: string };
    myResponse: { responseStatus: "pending" | "yes" | "no" };
    canceledAt: string | null;
  }>;
}) {
  const now = useInvitationClock();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{invitations.length}</Text>
      </View>
      <View style={styles.sectionItems}>
        {invitations.map((invitation) => (
          <ListRow
            key={invitation.id}
            title={invitation.placeName}
            subtitle={`${invitation.creator.pseudo} · ${formatDateTime(invitation.scheduledAt)} · ${formatStatus(
              invitation.myResponse.responseStatus, isInvitationOpen(invitation, now)
            )}`}
            onPress={() => router.push({ pathname: "/invitations/received/[id]", params: { id: invitation.id } })}
          />
        ))}
      </View>
    </View>
  );
}

function formatStatus(status: "pending" | "yes" | "no", open: boolean): string {
  if (status === "pending") {
    return open ? "à répondre" : "sans réponse";
  }

  return status === "yes" ? "oui" : "non";
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  sectionCount: {
    minWidth: 28,
    textAlign: "center",
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderWidth: borders.regular,
    borderColor: colors.border,
    borderRadius: radii.pill
  },
  sectionItems: {
    gap: spacing.sm
  }
});
