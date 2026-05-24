import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { isUpcomingInvitation, useReceivedInvitations } from "@/presentation/hooks/useInvitations";
import { formatDateTime } from "@/shared/date-format";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function ReceivedInvitationsScreen() {
  const invitations = useReceivedInvitations();
  const now = new Date();
  const upcomingInvitations = [...(invitations.data ?? [])]
    .filter((invitation) => isUpcomingInvitation(invitation, now))
    .sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());
  const pastInvitations = [...(invitations.data ?? [])]
    .filter((invitation) => !isUpcomingInvitation(invitation, now))
    .sort((left, right) => new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime());

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
      {upcomingInvitations.length > 0 ? (
        <InvitationSection
          title="En cours"
          invitations={upcomingInvitations}
        />
      ) : null}
      {pastInvitations.length > 0 ? (
        <InvitationSection
          title="Passées"
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
  }>;
}) {
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
              invitation.myResponse.responseStatus
            )}`}
            onPress={() => router.push({ pathname: "/invitations/received/[id]", params: { id: invitation.id } })}
          />
        ))}
      </View>
    </View>
  );
}

function formatStatus(status: "pending" | "yes" | "no"): string {
  if (status === "pending") {
    return "à répondre";
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
