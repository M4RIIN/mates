import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { Screen } from "@/presentation/components/Screen";
import { useCreatedInvitations } from "@/presentation/hooks/useInvitations";
import { formatDateTime } from "@/shared/date-format";
import { colors } from "@/shared/theme";

export function CreatedInvitationsScreen() {
  const invitations = useCreatedInvitations();

  return (
    <Screen>
      <Text style={styles.title}>Invitations créées</Text>
      {invitations.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {invitations.data?.length === 0 ? <EmptyState title="Aucune invitation créée" /> : null}
      {invitations.data?.map((invitation) => (
        <ListRow
          key={invitation.id}
          title={invitation.placeName}
          subtitle={`${formatDateTime(invitation.scheduledAt)} · ${invitation.recipients.length} ami(s)`}
          onPress={() => router.push({ pathname: "/invitations/created/[id]", params: { id: invitation.id } })}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900"
  }
});
