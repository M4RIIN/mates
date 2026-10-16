import { InvitationSharePanel } from "@/presentation/components/InvitationSharePanel";
import { getInvitationState, getInvitationEstimatedArrivalAt, isInvitationOpen } from "@mates/shared";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ban } from "lucide-react-native";
import { syncCreatedInvitationLiveActivity } from "@/infrastructure/live-activities/invitation-live-activity";
import { AppButton } from "@/presentation/components/AppButton";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { PlaceVenuePanel } from "@/presentation/components/PlaceVenuePanel";
import { Screen } from "@/presentation/components/Screen";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { useCancelInvitation, useInvitationDetails } from "@/presentation/hooks/useInvitations";
import { useRouteId } from "@/presentation/hooks/useRouteId";
import { useInvitationClock } from "@/presentation/hooks/useInvitationClock";
import { formatDateTime, formatTime } from "@/shared/date-format";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function CreatedInvitationDetailScreen() {
  const id = useRouteId();
  const invitation = useInvitationDetails(id);
  const cancelInvitation = useCancelInvitation(id ?? "");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const now = useInvitationClock();
  const recipients = invitation.data?.recipients ?? [];
  const guests = invitation.data?.guestResponses ?? [];
  const yesCount = recipients.filter((recipient) => recipient.responseStatus === "yes").length + guests.filter(g => g.responseStatus === "yes").length;
  const noCount = recipients.filter((recipient) => recipient.responseStatus === "no").length + guests.filter(g => g.responseStatus === "no").length;
  const pendingCount = recipients.filter((recipient) => recipient.responseStatus === "pending").length;
  const state = invitation.data === undefined ? undefined : getInvitationState(invitation.data, now);
  const awaitingResponse = invitation.data !== undefined && isInvitationOpen(invitation.data, now);

  useEffect(() => {
    if (invitation.data === undefined) {
      return;
    }

    syncCreatedInvitationLiveActivity(invitation.data).catch((error: unknown) => {
      console.warn("Failed to sync created invitation live activity", error);
    });
  }, [invitation.data, state]);

  function confirmCancel() {
    if (id === undefined) {
      return;
    }

    setCancelError(null);
    setCancelDialogOpen(true);
  }

  function cancelCreatedInvitation() {
    if (cancelInvitation.isPending) return;
    setCancelError(null);
    cancelInvitation.mutate(undefined, {
      onSuccess: () => {
        setCancelDialogOpen(false);
        router.replace("/sorties");
      },
      onError: (error: unknown) => {
        setCancelError(getErrorMessage(error));
      }
    });
  }

  return (
    <Screen>
      <CancelInvitationDialog
        open={cancelDialogOpen}
        loading={cancelInvitation.isPending}
        error={cancelError}
        onClose={() => {
          if (!cancelInvitation.isPending) {
            setCancelDialogOpen(false);
          }
        }}
        onConfirm={cancelCreatedInvitation}
      />
      {invitation.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {invitation.isError ? <View style={styles.errorPanel}><Text accessibilityRole="alert" style={styles.dialogError}>Impossible de charger la sortie : {getErrorMessage(invitation.error)}</Text><AppButton title="Réessayer" variant="secondary" loading={invitation.isFetching} onPress={() => { void invitation.refetch(); }} /></View> : null}
      {invitation.data !== undefined ? (
        <>
          <PageHeader
            eyebrow="Ta sortie"
            title={invitation.data.placeName}
            subtitle={formatDateTime(invitation.data.scheduledAt)}
            tone="red"
            compact
          />
          {invitation.data.canceledAt !== null ? (
            <View style={styles.closedBanner}>
              <Text style={styles.closedLabel}>Sortie annulée</Text>
              <Text style={styles.closedValue}>Annulée le {formatDateTime(invitation.data.canceledAt)}</Text>
            </View>
          ) : null}
          {state === "ongoing" || state === "ended" ? <Text accessibilityLiveRegion="polite" style={styles.sectionTitle}>{state === "ongoing" ? "Sortie en cours" : "Sortie terminée"}</Text> : null}
          <Text accessibilityRole="header" style={styles.sectionTitle}>{invitation.data.canceledAt !== null ? "Réponses avant annulation" : "Les réponses"}</Text>
          <View accessibilityLiveRegion="polite" style={styles.stats}>
            <View style={[styles.stat, styles.statYes]}>
              <Text style={styles.statNumber}>{yesCount}</Text>
              <Text style={styles.statLabel}>Viennent</Text>
            </View>
            <View style={[styles.stat, styles.statPending]}>
              <Text style={[styles.statNumber, styles.statTextLight]}>{pendingCount}</Text>
              <Text style={[styles.statLabel, styles.statTextLight]}>{awaitingResponse ? "À répondre" : "Sans réponse"}</Text>
            </View>
            <View style={[styles.stat, styles.statNo]}>
              <Text style={styles.statNumber}>{noCount}</Text>
              <Text style={styles.statLabel}>Ne viennent pas</Text>
            </View>
          </View>
          {recipients.length === 0 && guests.length === 0 ? (
            <EmptyState title="Aucun invité" subtitle="Partage le lien ci-dessous pour inviter tes proches." />
          ) : null}
          {recipients.map((recipient) => (
            <ListRow
              key={recipient.id}
              title={recipient.user.pseudo}
              subtitle={`${formatRecipientStatus(recipient.responseStatus, recipient.delayMinutes, awaitingResponse, invitation.data.scheduledAt)}${recipient.advanceRequest ? `\nDemande : ${recipient.advanceRequest}` : ""}`}
            />
          ))}
          {guests.length > 0 ? <Text accessibilityRole="header" style={styles.sectionTitle}>Invités par lien</Text> : null}
          {guests.map(guest => <ListRow key={guest.id} title={guest.name} subtitle={`Invité web · prénom non vérifié · ${guest.responseStatus === "yes" ? "Vient" : "Ne vient pas"}`} />)}
          <InvitationSharePanel id={invitation.data.id} closed={!awaitingResponse} />
          <PlaceVenuePanel
            invitationId={invitation.data.id}
            title={invitation.data.placeName}
            address={invitation.data.placeAddress}
            latitude={invitation.data.latitude}
            longitude={invitation.data.longitude}
            showReserveButton={awaitingResponse}
            showTransportActions={awaitingResponse}
          />
          {invitation.data.canceledAt === null ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Annuler la sortie" accessibilityState={{ disabled: cancelInvitation.isPending }} disabled={cancelInvitation.isPending} onPress={confirmCancel} style={styles.cancelRow}>
              <Ban size={17} color={colors.muted} />
              <Text style={styles.cancelLabel}>Annuler la sortie</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function CancelInvitationDialog({
  open,
  loading,
  error,
  onClose,
  onConfirm
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={onClose}>
      <View style={styles.dialogScrim}>
        <Pressable style={styles.dialogBackdrop} onPress={onClose} />
        <View accessibilityViewIsModal style={styles.dialogCard}>
          <Text accessibilityRole="header" style={styles.dialogTitle}>Annuler la sortie ?</Text>
          <ScrollView style={styles.dialogBody} contentContainerStyle={styles.dialogBodyContent}>
            <Text style={styles.dialogText}>Les amis invités dans Mates seront informés. Les invités par lien verront l’annulation en rouvrant le lien. Personne ne pourra plus répondre à cette sortie.</Text>
            {error !== null ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.dialogError}>Annulation impossible : {error}</Text> : null}
          </ScrollView>
          <View style={styles.dialogActions}>
            <View style={styles.dialogAction}>
              <AppButton title="Garder la sortie" onPress={onClose} variant="secondary" disabled={loading} />
            </View>
            <View style={styles.dialogAction}>
              <AppButton title="Annuler la sortie" onPress={onConfirm} variant="danger" loading={loading} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatRecipientStatus(status: "pending" | "yes" | "no", delayMinutes: number | null, awaitingResponse: boolean, scheduledAt: string): string {
  if (status === "pending") {
    return awaitingResponse ? "À répondre" : "Sans réponse";
  }

  if (status === "no") {
    return "Ne vient pas";
  }

  const arrival = formatTime(getInvitationEstimatedArrivalAt(scheduledAt, delayMinutes).toISOString());
  return `Vient · arrivée estimée à ${arrival}${delayMinutes ? ` · retard de ${delayMinutes} min` : ""}`;
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  errorPanel: { gap: spacing.sm },
  closedBanner: {
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.redSoft,
    padding: spacing.md,
    gap: spacing.xs
  },
  closedLabel: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  closedValue: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900"
  },
  cancelRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  cancelLabel: { color: colors.muted, fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
  dialogError: { color: colors.red, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  dialogScrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg
  },
  dialogBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  dialogCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    padding: spacing.md,
    gap: spacing.md
  },
  dialogTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900"
  },
  dialogText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700"
  },
  dialogActions: {
    gap: spacing.sm
  },
  dialogBody: { flexShrink: 1 },
  dialogBodyContent: { gap: spacing.sm },
  dialogAction: {
    width: "100%"
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm
  },
  stat: {
    flex: 1,
    minHeight: 84,
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    padding: spacing.sm,
    justifyContent: "space-between"
  },
  statYes: {
    backgroundColor: colors.yellow
  },
  statNo: {
    backgroundColor: colors.surface
  },
  statPending: {
    backgroundColor: colors.primary
  },
  statNumber: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700"
  },
  statTextLight: {
    color: colors.white
  }
});
