import { ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { useFriends } from "@/presentation/hooks/useFriends";
import { colors } from "@/shared/theme";

export function FriendsScreen() {
  const friends = useFriends();

  return (
    <Screen>
      <PageHeader
        eyebrow="Réseau"
        title="Amis"
        subtitle={friends.data !== undefined ? `${friends.data.length} ami(s) actif(s)` : "Chargement"}
        tone="yellow"
        compact
      />
      <AppButton
        title="Ajouter un ami"
        onPress={() => router.push("/friends/add")}
        variant="success"
        icon={<UserPlus size={18} color={colors.ink} strokeWidth={3} />}
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
