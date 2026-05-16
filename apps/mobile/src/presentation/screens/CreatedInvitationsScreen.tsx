import { ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { useCreatedInvitations } from "@/presentation/hooks/useInvitations";
import { formatDateTime } from "@/shared/date-format";
import { colors } from "@/shared/theme";

export function CreatedInvitationsScreen() {
  const invitations = useCreatedInvitations();

  return (
    <Screen>
      <PageHeader
        eyebrow="Historique"
        title="Créées"
        subtitle={invitations.data !== undefined ? `${invitations.data.length} invitation(s)` : "Chargement"}
        tone="red"
        compact
      />
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
