import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Check, UserPlus } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import {
  useAcceptFriendRequest,
  useFriends,
  useReceivedFriendRequests,
  useSentFriendRequests
} from "@/presentation/hooks/useFriends";
import { colors, spacing } from "@/shared/theme";

export function FriendsScreen() {
  const friends = useFriends();
  const receivedRequests = useReceivedFriendRequests();
  const sentRequests = useSentFriendRequests();
  const acceptFriendRequest = useAcceptFriendRequest();

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
      {receivedRequests.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {sentRequests.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {receivedRequests.data !== undefined && receivedRequests.data.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demandes reçues</Text>
          {receivedRequests.data.map((request) => (
            <View key={request.id} style={styles.requestRow}>
              <ListRow title={request.requester.pseudo} subtitle={request.requester.publicTag} />
              <AppButton
                title="Accepter"
                onPress={() => acceptFriendRequest.mutate(request.id)}
                loading={acceptFriendRequest.isPending && acceptFriendRequest.variables === request.id}
                variant="success"
                icon={<Check size={18} color={colors.ink} strokeWidth={3} />}
              />
            </View>
          ))}
        </View>
      ) : null}
      {sentRequests.data !== undefined && sentRequests.data.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demandes en attente</Text>
          {sentRequests.data.map((request) => (
            <ListRow
              key={request.id}
              title={request.addressee.pseudo}
              subtitle={`${request.addressee.publicTag} · En attente`}
            />
          ))}
        </View>
      ) : null}
      {friends.data?.length === 0 &&
      (receivedRequests.data?.length ?? 0) === 0 &&
      (sentRequests.data?.length ?? 0) === 0 ? (
        <EmptyState title="Aucun ami actif" subtitle="Ajoute un identifiant public pour envoyer tes invitations." />
      ) : null}
      {friends.data?.map((friend) => (
        <ListRow key={friend.id} title={friend.pseudo} subtitle={friend.publicTag} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  requestRow: {
    gap: spacing.sm
  }
});
