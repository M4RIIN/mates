import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
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
  const [name, setName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const friends = useFriends();
  const friendGroups = useFriendGroups();
  const createFriendGroup = useCreateFriendGroup();

  const selectedCount = selectedMemberIds.length;
  const selectedSet = useMemo(() => new Set(selectedMemberIds), [selectedMemberIds]);

  async function submit() {
    if (name.trim().length === 0) {
      Alert.alert("Nom manquant", "Donne un nom a ton groupe.");
      return;
    }

    if (selectedMemberIds.length === 0) {
      Alert.alert("Groupe vide", "Selectionne au moins un ami.");
      return;
    }

    try {
      await createFriendGroup.mutateAsync({
        name: name.trim(),
        memberUserIds: selectedMemberIds
      });
      setName("");
      setSelectedMemberIds([]);
    } catch (error: unknown) {
      Alert.alert("Creation impossible", getErrorMessage(error));
    }
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
        subtitle="Choisis qui recevra tes prochaines invitations."
        tone="yellow"
        compact
      />
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nouveau groupe</Text>
        <TextField label="Nom du groupe" value={name} onChangeText={setName} placeholder="Ex: Foot, proches, taf..." />
        <Text style={styles.helper}>{selectedCount} ami(s) selectionne(s)</Text>
        {friends.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {friends.data?.length === 0 ? (
          <EmptyState title="Aucun ami actif" subtitle="Ajoute des amis avant de creer un groupe." />
        ) : null}
        {friends.data?.map((friend) => (
          <ListRow
            key={friend.id}
            title={friend.pseudo}
            subtitle={friend.publicTag}
            onPress={() => toggleMember(friend.id)}
            right={
              <View style={[styles.checkBadge, selectedSet.has(friend.id) ? styles.checkBadgeActive : null]}>
                {selectedSet.has(friend.id) ? <Check size={16} color={colors.ink} strokeWidth={3} /> : null}
              </View>
            }
          />
        ))}
        <AppButton
          title="Creer le groupe"
          onPress={submit}
          variant="success"
          loading={createFriendGroup.isPending}
          disabled={name.trim().length === 0 || selectedMemberIds.length === 0}
          icon={<Users size={18} color={colors.ink} strokeWidth={3} />}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Groupes existants</Text>
        {friendGroups.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {friendGroups.data?.length === 0 ? (
          <EmptyState title="Aucun groupe" subtitle="Cree ton premier groupe pour cibler tes invitations." />
        ) : null}
        {friendGroups.data?.map((group) => (
          <ListRow
            key={group.id}
            title={group.name}
            subtitle={group.members.map((member) => member.pseudo).join(" · ")}
            onPress={() => router.push({ pathname: "/friends/groups/[id]", params: { id: group.id } })}
            right={<Text style={styles.countPill}>{group.members.length}</Text>}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
