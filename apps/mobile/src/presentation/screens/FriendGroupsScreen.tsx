import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, Users } from "lucide-react-native";
import { router } from "expo-router";
import { AppButton } from "@/presentation/components/AppButton";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { useCreateFriendGroup, useFriendGroups, useFriends } from "@/presentation/hooks/useFriends";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function FriendGroupsScreen() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  const creationBody = useRef<ScrollView>(null);
  useEffect(() => {
    if (error) creationBody.current?.scrollTo({ y: 0, animated: false });
  }, [error]);
  const [name, setName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const friends = useFriends();
  const friendGroups = useFriendGroups();
  const createFriendGroup = useCreateFriendGroup();

  const validIds = (friends.data ?? []).filter((friend) => selectedMemberIds.includes(friend.id)).map((friend) => friend.id);
  const selectedCount = validIds.length;
  const selectedSet = useMemo(() => new Set(selectedMemberIds), [selectedMemberIds]);

  async function submit() {
    if (sending.current || friends.isFetching || friends.isError || !name.trim() || validIds.length === 0 || validIds.length > 100) return;
    sending.current = true;
    setError(null);
    try {
      await createFriendGroup.mutateAsync({ name: name.trim(), memberUserIds: validIds });
      setName("");
      setSelectedMemberIds([]);
      setCreating(false);
    } catch (cause: unknown) {
      setError(getErrorMessage(cause));
    } finally {
      sending.current = false;
    }
  }

  function closeCreation() {
    if (!sending.current) setCreating(false);
  }

  function toggleMember(userId: string) {
    setSelectedMemberIds((current) =>
      current.includes(userId) ? current.filter((entry) => entry !== userId) : [...current, userId]
    );
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Organisation"
        title="Groupes d'amis"
        subtitle="Tes listes d’invités personnelles, à retrouver quand tu proposes une sortie."
        tone="yellow"
        compact
      />
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mes groupes</Text>
        {friendGroups.isLoading ? <ActivityIndicator accessibilityLabel="Chargement des groupes" color={colors.primary} /> : null}
        {friendGroups.isError ? <>
          <Text accessibilityRole="alert" style={styles.helper}>Impossible de charger tes groupes.</Text>
          <AppButton title="Réessayer" onPress={() => { void friendGroups.refetch(); }} />
        </> : null}
        {!friendGroups.isLoading && !friendGroups.isError && friendGroups.data?.length === 0 ? (
          <EmptyState title="Aucun groupe" subtitle="Rassemble tes amis habituels dans une liste pour les choisir plus vite lors d’une sortie." />
        ) : null}
        {friendGroups.data?.map((group) => (
          <ListRow key={group.id} title={group.name}
            subtitle={group.members.map((member) => member.pseudo).join(" · ") || "Aucun membre"}
            onPress={() => router.push({ pathname: "/friends/groups/[id]", params: { id: group.id } })}
            right={<Text style={styles.countPill}>{group.members.length}</Text>} />
        ))}
      </View>
      <AppButton title="Créer un groupe" onPress={() => { setError(null); setCreating(true); }} icon={<Users size={18} color={colors.ink} />} />
      <Text style={styles.helper}>Ouvre un groupe pour modifier ses membres. Dans Proposer, retrouve-le via « Qui invites-tu ? » ; tu peux ensuite ajuster les invités.</Text>
      <Modal transparent visible={creating} animationType="fade" onRequestClose={closeCreation}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.scrim}>
          <View accessibilityViewIsModal style={styles.modal}>
            <Text accessibilityRole="header" style={styles.modalTitle}>Créer un groupe</Text>
            <ScrollView ref={creationBody} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
              {error ? <Text accessibilityRole="alert" style={styles.helper}>{error}</Text> : null}
              <Text style={styles.helper}>Cette liste est personnelle : tes amis ne rejoignent pas un espace partagé.</Text>
              <TextField label="Nom du groupe" accessibilityLabel="Nom du groupe" value={name} onChangeText={setName} maxLength={48} editable={!createFriendGroup.isPending} placeholder="Ex. : Foot, proches, collègues" />
              <Text style={styles.helper}>{selectedCount} {selectedCount > 1 ? "amis sélectionnés" : "ami sélectionné"}</Text>
              {friends.isFetching && !friends.isLoading ? <Text style={styles.helper}>Vérification des amis…</Text> : null}
              {!friends.isLoading && !friends.isError && selectedMemberIds.length > selectedCount ? <Text accessibilityRole="alert" style={styles.helper}>Certains amis ne sont plus disponibles et ont été retirés de la sélection.</Text> : null}
              {friends.isLoading ? <ActivityIndicator accessibilityLabel="Chargement des amis" color={colors.primary} /> : null}
              {friends.isError ? <><Text accessibilityRole="alert" style={styles.helper}>Impossible de charger tes amis.</Text><AppButton title="Réessayer les amis" onPress={() => { void friends.refetch(); }} /></> : null}
              {!friends.isLoading && !friends.isError && friends.data?.length === 0 ? <>
                <EmptyState title="Ajoute ton premier ami" subtitle="Il te faut au moins un ami pour créer une liste d’invités." />
                <AppButton title="Ajouter un ami" onPress={() => { closeCreation(); router.push("/friends/add"); }} />
              </> : null}
              {!friends.isError && friends.data?.map((friend) => {
                const checked = selectedSet.has(friend.id);
                return <Pressable key={friend.id} accessibilityRole="checkbox" accessibilityState={{ checked, disabled: createFriendGroup.isPending }} accessibilityLabel={friend.pseudo + ", " + friend.publicTag} disabled={createFriendGroup.isPending} onPress={() => toggleMember(friend.id)} style={styles.friend}>
                  <View style={styles.identity}><Text style={styles.friendName}>{friend.pseudo}</Text><Text style={styles.helper}>{friend.publicTag}</Text></View>
                  <View style={[styles.checkBadge, checked && styles.checkBadgeActive]}>{checked ? <Check size={16} color={colors.ink} /> : null}</View>
                </Pressable>;
              })}
              {selectedCount > 100 ? <Text accessibilityRole="alert" style={styles.helper}>Choisis au maximum 100 amis.</Text> : null}
            </ScrollView>
            <AppButton title="Créer le groupe" onPress={submit} variant="success" loading={createFriendGroup.isPending} disabled={!name.trim() || selectedCount === 0 || selectedCount > 100 || friends.isFetching || friends.isError} />
            <AppButton title="Annuler" variant="secondary" disabled={createFriendGroup.isPending} onPress={closeCreation} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: "center", padding: spacing.md, backgroundColor: "rgba(7, 26, 45, 0.3)" },
  modal: { maxHeight: "90%", width: "100%", maxWidth: 600, alignSelf: "center", padding: spacing.md, gap: spacing.sm, borderWidth: borders.regular, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background },
  modalTitle: { color: colors.ink, fontSize: 22, fontWeight: "900" },
  content: { gap: spacing.sm, paddingBottom: spacing.sm },
  friend: { minHeight: 64, padding: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: borders.regular, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  identity: { flex: 1, minWidth: 0 },
  friendName: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceStrong
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  helper: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  checkBadgeActive: {
    backgroundColor: colors.yellow
  },
  countPill: {
    minWidth: 34,
    textAlign: "center",
    color: colors.ink,
    fontWeight: "900",
    fontSize: 12,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderWidth: borders.regular,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.yellowSoft
  }
});
