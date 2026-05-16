import { ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { useReceivedInvitations } from "@/presentation/hooks/useInvitations";
import { formatDateTime } from "@/shared/date-format";
import { colors } from "@/shared/theme";

export function ReceivedInvitationsScreen() {
  const invitations = useReceivedInvitations();

  return (
    <Screen>
      <PageHeader
        eyebrow="Inbox"
        title="Reçues"
        subtitle={invitations.data !== undefined ? `${invitations.data.length} invitation(s)` : "Chargement"}
        tone="blue"
        compact
      />
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
