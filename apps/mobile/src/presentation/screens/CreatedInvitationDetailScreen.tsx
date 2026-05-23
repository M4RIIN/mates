import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ban } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { PlaceVenuePanel } from "@/presentation/components/PlaceVenuePanel";
import { Screen } from "@/presentation/components/Screen";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { useCancelInvitation, useInvitationDetails } from "@/presentation/hooks/useInvitations";
import { useRouteId } from "@/presentation/hooks/useRouteId";
import { formatDateTime, formatTime } from "@/shared/date-format";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function CreatedInvitationDetailScreen() {
  const id = useRouteId();
  const invitation = useInvitationDetails(id);
  const cancelInvitation = useCancelInvitation(id ?? "");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const recipients = invitation.data?.recipients ?? [];
  const yesCount = recipients.filter((recipient) => recipient.responseStatus === "yes").length;
  const noCount = recipients.filter((recipient) => recipient.responseStatus === "no").length;
  const pendingCount = recipients.filter((recipient) => recipient.responseStatus === "pending").length;

  function confirmCancel() {
    if (id === undefined) {
      return;
    }

    setCancelDialogOpen(true);
  }

  function cancelCreatedInvitation() {
    cancelInvitation.mutate(undefined, {
      onSuccess: () => {
        setCancelDialogOpen(false);
      },
      onError: (error: unknown) => {
        setCancelDialogOpen(false);
        if (typeof window !== "undefined" && typeof window.alert === "function") {
          window.alert(getErrorMessage(error));
          return;
        }

        console.warn("Annulation impossible", error);
      }
    });
  }

  return (
    <Screen>
      <CancelInvitationDialog
        open={cancelDialogOpen}
        loading={cancelInvitation.isPending}
        onClose={() => {
          if (!cancelInvitation.isPending) {
            setCancelDialogOpen(false);
          }
        }}
        onConfirm={cancelCreatedInvitation}
      />
      {invitation.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {invitation.data !== undefined ? (
        <>
          <PageHeader
            eyebrow="Invitation créée"
            title={invitation.data.placeName}
            subtitle={formatDateTime(invitation.data.scheduledAt)}
            tone="red"
            compact
          />
          <View style={styles.timeHero}>
            <Text style={styles.timeHeroLabel}>Heure de rendez-vous</Text>
            <Text style={styles.timeHeroValue}>{formatTime(invitation.data.scheduledAt)}</Text>
          </View>
          {invitation.data.canceledAt !== null ? (
            <View style={styles.closedBanner}>
              <Text style={styles.closedLabel}>Invitation annulée</Text>
              <Text style={styles.closedValue}>Clôturée le {formatDateTime(invitation.data.canceledAt)}</Text>
            </View>
          ) : (
            <View style={styles.cancelRow}>
              <AppButton
                title="Fermer l'invitation"
                onPress={confirmCancel}
                loading={cancelInvitation.isPending}
                variant="danger"
                icon={<Ban size={18} color={colors.white} strokeWidth={3} />}
              />
            </View>
          )}
          <PlaceVenuePanel
            title={invitation.data.placeName}
            address={invitation.data.placeAddress}
            latitude={invitation.data.latitude}
            longitude={invitation.data.longitude}
            showReserveButton
          />
          <View style={styles.stats}>
            <View style={[styles.stat, styles.statYes]}>
              <Text style={styles.statNumber}>{yesCount}</Text>
              <Text style={styles.statLabel}>Oui</Text>
            </View>
            <View style={[styles.stat, styles.statNo]}>
              <Text style={[styles.statNumber, styles.statTextLight]}>{noCount}</Text>
              <Text style={[styles.statLabel, styles.statTextLight]}>Non</Text>
            </View>
            <View style={[styles.stat, styles.statPending]}>
              <Text style={[styles.statNumber, styles.statTextLight]}>{pendingCount}</Text>
              <Text style={[styles.statLabel, styles.statTextLight]}>Attente</Text>
            </View>
          </View>
          {recipients.length === 0 ? (
            <EmptyState title="Aucun destinataire" subtitle="Ajoute des amis actifs avant la prochaine invitation." />
          ) : null}
          {recipients.map((recipient) => (
            <ListRow
              key={recipient.id}
              title={recipient.user.pseudo}
              subtitle={formatRecipientStatus(recipient.responseStatus, recipient.delayMinutes)}
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function CancelInvitationDialog({
  open,
  loading,
  onClose,
  onConfirm
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={onClose}>
      <View style={styles.dialogScrim}>
        <Pressable style={styles.dialogBackdrop} onPress={onClose} />
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>Annuler l'invitation</Text>
          <Text style={styles.dialogText}>Tous les destinataires recevront une notification d'annulation.</Text>
          <View style={styles.dialogActions}>
            <View style={styles.dialogAction}>
              <AppButton title="Retour" onPress={onClose} variant="secondary" />
            </View>
            <View style={styles.dialogAction}>
              <AppButton title="Confirmer" onPress={onConfirm} variant="danger" loading={loading} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatRecipientStatus(status: "pending" | "yes" | "no", delayMinutes: number | null): string {
  if (status === "pending") {
    return "Pas encore répondu";
  }

  if (status === "no") {
    return "Non";
  }

  return delayMinutes === null ? "Oui" : `Oui · retard ${delayMinutes} min`;
}

const styles = StyleSheet.create({
  timeHero: {
    borderRadius: radii.md,
    borderWidth: borders.heavy,
    borderColor: colors.border,
    backgroundColor: colors.yellow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: spacing.xs
  },
  timeHeroLabel: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  timeHeroValue: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: "900"
  },
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
    width: "100%"
  },
  dialogScrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg
  },
  dialogBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  dialogCard: {
    width: "100%",
    maxWidth: 420,
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
    flexDirection: "row",
    gap: spacing.sm
  },
  dialogAction: {
    flex: 1
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm
  },
  stat: {
    flex: 1,
    minHeight: 88,
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
    backgroundColor: colors.red
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
    fontWeight: "900",
    textTransform: "uppercase"
  },
  statTextLight: {
    color: colors.white
  }
});
