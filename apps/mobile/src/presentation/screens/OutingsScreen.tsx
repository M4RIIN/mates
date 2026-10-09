import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { isPendingUpcomingInvitation } from "@/domain/invitation/status";
import { AppButton } from "@/presentation/components/AppButton";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { useInvitationClock } from "@/presentation/hooks/useInvitationClock";
import { isUpcomingInvitation, useCreatedInvitations, useReceivedInvitations } from "@/presentation/hooks/useInvitations";
import { formatDateTime } from "@/shared/date-format";
import { borders, colors, radii, spacing } from "@/shared/theme";

const filters = [{ value: "all", label: "Toutes" }, { value: "pending", label: "À répondre" },
  { value: "created", label: "Organisées" }, { value: "received", label: "Reçues" }] as const;

export function OutingsScreen() {
  const { filter: parameter } = useLocalSearchParams<{ filter?: string }>();
  const filter = parameter === "pending" || parameter === "created" || parameter === "received" ? parameter : "all";
  const received = useReceivedInvitations();
  const created = useCreatedInvitations();
  const now = useInvitationClock();
  const receivedRows = (received.data ?? [])
    .filter((invitation) => filter !== "created" && (filter !== "pending" || isPendingUpcomingInvitation(invitation, now)))
    .map((invitation) => ({ invitation, organized: false, subtitle:
      `De ${invitation.creator.pseudo} · ${invitation.canceledAt !== null ? "Annulée" : invitation.myResponse.responseStatus === "pending" ? (isPendingUpcomingInvitation(invitation, now) ? "À répondre" : "Sans réponse") : invitation.myResponse.responseStatus === "yes" ? "Tu viens" : "Tu ne viens pas"}` }));
  const createdRows = filter === "all" || filter === "created" ? (created.data ?? []).map((invitation) => ({
    invitation, organized: true, subtitle: `Organisée par toi · ${invitation.recipients.length} invité(s)`
  })) : [];
  const rows = [...createdRows, ...receivedRows.filter((row) => !createdRows.some((entry) => entry.invitation.id === row.invitation.id))];
  const upcoming = rows.filter((row) => isUpcomingInvitation(row.invitation, now))
    .sort((a, b) => Date.parse(a.invitation.scheduledAt) - Date.parse(b.invitation.scheduledAt));
  const past = rows.filter((row) => !isUpcomingInvitation(row.invitation, now))
    .sort((a, b) => Date.parse(b.invitation.scheduledAt) - Date.parse(a.invitation.scheduledAt));
  const needsReceived = filter !== "created";
  const needsCreated = filter === "all" || filter === "created";
  const loading = (needsReceived && received.isLoading) || (needsCreated && created.isLoading);
  const failed = (needsReceived && received.isError) || (needsCreated && created.isError);

  function renderSection(title: string, entries: typeof rows) {
    return entries.length > 0 ? (
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{title} · {entries.length}</Text>
        {entries.map(({ invitation, organized, subtitle }) => (
          <ListRow key={invitation.id} title={invitation.placeName}
            subtitle={`${formatDateTime(invitation.scheduledAt)}\n${subtitle}${organized && invitation.canceledAt !== null ? " · Annulée" : ""}`}
            onPress={() => router.push({ pathname: organized ? "/invitations/created/[id]" : "/invitations/received/[id]", params: { id: invitation.id } })} />
        ))}
      </View>
    ) : null;
  }

  return (
    <Screen>
      <PageHeader title="Sorties" subtitle="Tes invitations et les sorties que tu organises." tone="blue" compact />
      <View style={styles.filters}>
        {filters.map((entry) => (
          <Pressable key={entry.value} accessibilityRole="tab" accessibilityState={{ selected: filter === entry.value }}
            onPress={() => router.setParams({ filter: entry.value })}
            style={[styles.filter, filter === entry.value && styles.selected]}>
            <Text style={[styles.filterText, filter === entry.value && styles.selectedText]}>{entry.label}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <ActivityIndicator accessibilityLabel="Chargement des sorties" color={colors.primary} /> : null}
      {failed ? <View style={styles.section}>
        <Text accessibilityRole="alert" style={styles.error}>Certaines sorties n’ont pas pu être chargées.</Text>
        <AppButton title="Réessayer" variant="secondary" onPress={() => { if (needsReceived) void received.refetch(); if (needsCreated) void created.refetch(); }} />
      </View> : null}
      {!loading && !failed && rows.length === 0 ? <EmptyState
        title={filter === "pending" ? "Tu n’as aucune invitation à répondre" : filter === "created" ? "Tu n’as pas encore organisé de sortie" : "Aucune sortie pour le moment"}
        subtitle={filter === "pending" ? "Tes autres invitations sont dans Toutes." : "Propose une sortie à tes amis depuis Proposer."} /> : null}
      {renderSection("À venir", upcoming)}
      {renderSection("Passées ou annulées", past)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  filter: { minHeight: 44, paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, justifyContent: "center",
    borderWidth: borders.regular, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.surface },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  selectedText: { color: colors.white },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  error: { color: colors.redPressed, fontSize: 14 }
});
