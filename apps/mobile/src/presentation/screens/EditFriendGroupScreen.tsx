import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { Check, Users } from "lucide-react-native";
import { router } from "expo-router";
import { AppButton } from "@/presentation/components/AppButton";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { useFriendGroups, useFriends, useUpdateFriendGroupMembers } from "@/presentation/hooks/useFriends";
import { useRouteId } from "@/presentation/hooks/useRouteId";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function EditFriendGroupScreen() {
  const id = useRouteId();
  const friends = useFriends();
  const friendGroups = useFriendGroups();
  const updateFriendGroupMembers = useUpdateFriendGroupMembers(id ?? "");
  const group = friendGroups.data?.find((entry) => entry.id === id);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selectedMemberIds), [selectedMemberIds]);

  useEffect(() => {
    if (group !== undefined && friends.data !== undefined) {
      const activeFriendIds = new Set(friends.data.map((friend) => friend.id));
      setSelectedMemberIds(group.members.map((member) => member.id).filter((memberId) => activeFriendIds.has(memberId)));
    }
  }, [friends.data, group]);

  async function submit() {
    if (id === undefined || group === undefined) {
      return;
    }

    if (selectedMemberIds.length === 0) {
      Alert.alert("Groupe vide", "Garde au moins un ami dans ce groupe.");
      return;
    }

    try {
      await updateFriendGroupMembers.mutateAsync({
        memberUserIds: selectedMemberIds
      });
      router.back();
    } catch (error: unknown) {
      Alert.alert("Mise à jour impossible", getErrorMessage(error));
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
        title={group?.name ?? "Groupe"}
        subtitle="Ta liste d’invités personnelle. Ajoute ou retire des amis pour tes prochaines sorties."
        tone="yellow"
        compact
      />
      {friendGroups.isLoading || friends.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {friendGroups.isError || friends.isError ? <View style={styles.card}><Text accessibilityRole="alert" style={styles.helper}>Impossible de charger le groupe ou tes amis.</Text><AppButton title="Réessayer" onPress={() => { void friendGroups.refetch(); void friends.refetch(); }} /></View> : null}
      {group === undefined && !friendGroups.isLoading && !friendGroups.isError ? (
        <EmptyState title="Groupe introuvable" subtitle="Ce groupe n'existe plus ou n'est plus accessible." />
      ) : null}
      {group !== undefined ? (
        <View style={styles.card}>
          <Text style={styles.helper}>{selectedMemberIds.length} {selectedMemberIds.length > 1 ? "amis dans ce groupe" : "ami dans ce groupe"}</Text>
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
          {friends.data?.length === 0 ? (
            <View style={{ gap: spacing.sm }}><EmptyState title="Aucun ami" subtitle="Ajoute des amis avant de modifier ce groupe." /><AppButton title="Ajouter un ami" onPress={() => router.push("/friends/add")} /></View>
          ) : null}
          <AppButton
            title="Enregistrer"
            onPress={submit}
            variant="success"
            loading={updateFriendGroupMembers.isPending}
            disabled={selectedMemberIds.length === 0 || selectedMemberIds.length > 100 || friends.isFetching || friends.isError || friendGroups.isError}
            icon={<Users size={18} color={colors.ink} strokeWidth={3} />}
          />
        </View>
      ) : null}
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
  }
});
