import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { isPendingUpcomingInvitation } from "@/domain/invitation/status";
import { AppButton } from "@/presentation/components/AppButton";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { OnboardingGuide } from "@/presentation/components/OnboardingGuide";
import { useCurrentUser } from "@/presentation/hooks/useAuth";
import { useFriends } from "@/presentation/hooks/useFriends";
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
  const friends = useFriends();
  const currentUser = useCurrentUser();
  const now = useInvitationClock();
  const receivedRows = (received.data ?? [])
    .filter((invitation) => filter !== "created" && (filter !== "pending" || isPendingUpcomingInvitation(invitation, now)))
    .map((invitation) => ({ invitation, organized: false as const, subtitle:
      `De ${invitation.creator.pseudo} · ${invitation.canceledAt !== null ? "Annulée" : invitation.myResponse.responseStatus === "pending" ? (isPendingUpcomingInvitation(invitation, now) ? "À répondre" : "Sans réponse") : invitation.myResponse.responseStatus === "yes" ? "Tu viens" : "Tu ne viens pas"}` }));
  const createdRows = filter === "all" || filter === "created" ? (created.data ?? []).map((invitation) => ({
    invitation, organized: true as const, subtitle: `Organisée par toi · ${invitation.recipients.length} invité(s)`
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
  const dashboard = filter === "all";
  const pending = upcoming.filter((row) => !row.organized && isPendingUpcomingInvitation(row.invitation, now));
  const confirmed = upcoming.filter((row) => row.organized || (!row.organized && row.invitation.myResponse.responseStatus === "yes"));
  const other = upcoming.filter((row) => !pending.includes(row) && !confirmed.includes(row));
  const noFriends = friends.isSuccess && friends.data.length === 0;

  async function shareIdentifier() {
    const tag = currentUser.data?.publicTag;
    if (!tag) return;
    try {
      await Share.share({ message: `Retrouve-moi sur Mates avec mon identifiant ${tag}. Dans Amis, choisis Ajouter un ami et saisis cet identifiant.` });
    } catch {
      Alert.alert("Partage impossible", "Tu peux retrouver et copier ton identifiant dans Profil.");
    }
  }

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
      {currentUser.data?.onboardingCompletedAt === null ? <OnboardingGuide key={currentUser.data.id} user={currentUser.data} /> : null}
      <PageHeader title="Sorties" subtitle={dashboard ? "Un plan t’attend ? Retrouve-le ici." : "Tes invitations et les sorties que tu organises."} tone="blue" compact />
      <View style={styles.filters}>
        {filters.map((entry) => (
          <Pressable key={entry.value} accessibilityRole="tab" accessibilityState={{ selected: filter === entry.value }}
            onPress={() => router.setParams({ filter: entry.value })}
            style={[styles.filter, filter === entry.value && styles.selected]}>
            <Text style={[styles.filterText, filter === entry.value && styles.selectedText]}>{entry.label}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <View style={styles.section}><ActivityIndicator accessibilityLabel="Chargement des sorties" color={colors.primary} /><Text style={styles.body}>Chargement de tes sorties…</Text></View> : null}
      {failed ? <View style={styles.section}>
        <Text accessibilityRole="alert" style={styles.error}>Certaines sorties n’ont pas pu être chargées.</Text>
        <AppButton title="Réessayer" variant="secondary" onPress={() => { if (needsReceived) void received.refetch(); if (needsCreated) void created.refetch(); }} />
      </View> : null}
      {!dashboard && !loading && !failed && rows.length === 0 ? <EmptyState
        title={filter === "pending" ? "Tu n’as aucune invitation à répondre" : filter === "created" ? "Tu n’as pas encore organisé de sortie" : "Aucune sortie pour le moment"}
        subtitle={filter === "pending" ? "Tes autres invitations sont dans Toutes." : "Propose une sortie à tes amis depuis Proposer."} /> : null}
      {dashboard ? <>
        {renderSection("À répondre", pending)}
        {!loading && !failed && pending.length === 0 ? <Text style={styles.body}>Tu n’as aucune invitation à répondre.</Text> : null}
        <AppButton title="Proposer une sortie" onPress={() => router.navigate("/home")} />
        {friends.isError ? <View style={styles.section}><Text style={styles.body}>Ton réseau d’amis n’a pas pu être chargé.</Text><AppButton title="Réessayer pour les amis" variant="secondary" onPress={() => { void friends.refetch(); }} /></View> : null}
        {renderSection("Prochaines sorties", confirmed)}
        {!loading && !failed && confirmed.length === 0 ? <EmptyState title="Aucune sortie prévue" subtitle={pending.length > 0 ? "Réponds à une invitation pour retrouver la sortie ici." : "Un café, un verre ou une balade ? Propose un moment à tes amis."} /> : null}
        {noFriends ? <View style={styles.welcome}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Retrouve tes amis sur Mates</Text>
          <Text style={styles.body}>Partage ton identifiant pour qu’ils puissent t’ajouter, ou ajoute-les avec le leur.</Text>
          {currentUser.data ? <AppButton title="Partager mon identifiant" variant="secondary" onPress={() => { void shareIdentifier(); }} /> : <AppButton title="Voir mon identifiant" variant="secondary" onPress={() => router.navigate("/profile")} />}
          <AppButton title="Ajouter un ami" variant="secondary" onPress={() => router.push("/friends/add")} />
        </View> : null}
        {renderSection("Autres invitations", other)}
      </> : renderSection("À venir", upcoming)}
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
  body: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  welcome: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.yellowSoft, borderRadius: radii.md, borderWidth: borders.regular, borderColor: colors.border },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  error: { color: colors.redPressed, fontSize: 14 }
});
