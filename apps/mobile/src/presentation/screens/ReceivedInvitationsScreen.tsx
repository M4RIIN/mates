import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { Screen } from "@/presentation/components/Screen";
import { useReceivedInvitations } from "@/presentation/hooks/useInvitations";
import { formatDateTime } from "@/shared/date-format";
import { colors } from "@/shared/theme";

export function ReceivedInvitationsScreen() {
  const invitations = useReceivedInvitations();

  return (
    <Screen>
      <Text style={styles.title}>Invitations reçues</Text>
      {invitations.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {invitations.data?.length === 0 ? <EmptyState title="Aucune invitation reçue" /> : null}
      {invitations.data?.map((invitation) => (
        <ListRow
          key={invitation.id}
          title={invitation.placeName}
          subtitle={`${invitation.creator.pseudo} · ${formatDateTime(invitation.scheduledAt)} · ${formatStatus(
            invitation.myResponse.responseStatus
          )}`}
          onPress={() => router.push({ pathname: "/invitations/received/[id]", params: { id: invitation.id } })}
        />
      ))}
    </Screen>
  );
}

function formatStatus(status: "pending" | "yes" | "no"): string {
  if (status === "pending") {
    return "à répondre";
  }

  return status === "yes" ? "oui" : "non";
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900"
  }
});
