import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { Screen } from "@/presentation/components/Screen";
import { useFriends } from "@/presentation/hooks/useFriends";
import { colors, spacing } from "@/shared/theme";

export function FriendsScreen() {
  const friends = useFriends();

  return (
    <Screen>
      <Text style={styles.title}>Amis</Text>
      <AppButton
        title="Ajouter un ami"
        onPress={() => router.push("/friends/add")}
        icon={<UserPlus size={18} color="#FFFFFF" />}
      />
      {friends.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {friends.data?.length === 0 ? (
        <EmptyState title="Aucun ami actif" subtitle="Ajoute un identifiant public pour envoyer tes invitations." />
      ) : null}
      {friends.data?.map((friend) => (
        <ListRow key={friend.id} title={friend.pseudo} subtitle={friend.publicTag} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginBottom: spacing.xs
  }
});
