import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Check, Square, X } from "lucide-react-native";
import { AppButton } from "./AppButton";
import { ListRow } from "./ListRow";
import { borders, colors, radii, spacing } from "@/shared/theme";

type Props = {
  groups: Array<{ id: string; name: string; members: Array<{ id: string }> }>;
  friends: Array<{ id: string; pseudo: string; publicTag: string }>;
  initialIds: string[];
  loading: boolean;
  failed: boolean;
  groupsFailed: boolean;
  groupsLoading: boolean;
  onRetry: () => void;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
};

export function AudiencePicker({ groups, friends, initialIds, loading, failed, groupsFailed, groupsLoading, onRetry, onClose, onConfirm }: Props) {
  const [draftIds, setDraftIds] = useState(initialIds);
  const validIds = friends.filter((friend) => draftIds.includes(friend.id)).map((friend) => friend.id);
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}><View accessibilityViewIsModal style={styles.card}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>Choisir mes invités</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Annuler la sélection" onPress={onClose} style={styles.close}><X size={22} color={colors.ink} /></Pressable>
        </View>
        {loading ? <ActivityIndicator accessibilityLabel="Chargement des amis" color={colors.primary} /> : null}
        {failed ? <><Text accessibilityRole="alert" style={styles.body}>Impossible de charger tes amis.</Text><AppButton title="Réessayer" onPress={onRetry} /></> : null}
        {!failed && !loading && friends.length === 0 ? <><Text style={styles.body}>Ajoute un ami pour proposer ta première sortie.</Text><AppButton title="Ajouter un ami" onPress={() => { onClose(); router.push("/friends/add"); }} /></> : null}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          {!failed && !loading && friends.length > 0 ? <>
            <ListRow title={`Tous mes amis · ${friends.length}`} subtitle="Sélectionne les personnes affichées ci-dessous" onPress={() => setDraftIds(friends.map((friend) => friend.id))} />
            <Text style={styles.sectionTitle}>Mes groupes</Text>
            <Text style={styles.body}>Un groupe présélectionne ses amis ; tu peux ajuster la liste.</Text>
            {groupsLoading ? <ActivityIndicator accessibilityLabel="Chargement des groupes" color={colors.primary} /> : null}
            {groupsFailed ? <><Text style={styles.body}>Les groupes n’ont pas pu être chargés. Tu peux choisir tes amis individuellement.</Text><AppButton title="Réessayer les groupes" variant="secondary" onPress={onRetry} /></> : null}
            {groups.map((group) => {
              const members = friends.filter((friend) => group.members.some((member) => member.id === friend.id));
              return <ListRow key={group.id} title={group.name} subtitle={`${members.length} invité(s) · ${members.map((member) => member.pseudo).join(", ") || "Aucun ami disponible"}`} {...(members.length > 0 ? { onPress: () => setDraftIds(members.map((friend) => friend.id)) } : {})} />;
            })}
            <Text style={styles.sectionTitle}>Mes amis · {validIds.length} sélectionné(s)</Text>
            {friends.map((friend) => {
              const checked = validIds.includes(friend.id);
              return <Pressable key={friend.id} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={`${friend.pseudo}, ${friend.publicTag}`}
                onPress={() => setDraftIds((ids) => ids.includes(friend.id) ? ids.filter((id) => id !== friend.id) : [...ids, friend.id])} style={[styles.friend, checked && styles.selected]}>
                {checked ? <Check size={22} color={colors.primary} /> : <Square size={22} color={colors.ink} />}
                <View style={styles.identity}><Text style={styles.name}>{friend.pseudo}</Text><Text style={styles.body}>{friend.publicTag}</Text></View>
              </Pressable>;
            })}
          </> : null}
        </ScrollView>
        {validIds.length > 100 ? <Text style={styles.body}>Choisis au maximum 100 invités.</Text> : null}
        <AppButton title={`Valider · ${validIds.length} invité(s)`} disabled={failed || loading || validIds.length === 0 || validIds.length > 100} onPress={() => onConfirm(validIds)} />
      </View></View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(7, 26, 45, 0.3)", justifyContent: "center", padding: spacing.md },
  card: { maxHeight: "85%", width: "100%", maxWidth: 600, alignSelf: "center", borderRadius: radii.md, borderWidth: borders.regular, borderColor: colors.border, backgroundColor: colors.background, padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, color: colors.ink, fontSize: 22, fontWeight: "900" },
  close: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center" },
  list: { gap: spacing.sm, paddingBottom: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  friend: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, borderWidth: borders.regular, borderColor: colors.border, backgroundColor: colors.surface },
  selected: { backgroundColor: colors.blueSoft, borderColor: colors.primary },
  identity: { flex: 1 },
  name: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  body: { color: colors.muted, fontSize: 14, lineHeight: 20 }
});
