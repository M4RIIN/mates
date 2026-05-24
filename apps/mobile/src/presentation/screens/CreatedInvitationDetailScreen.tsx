import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Inbox, Send, Settings, User, Users, X } from "lucide-react-native";
import { Ban } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { EmptyState } from "@/presentation/components/EmptyState";
import { ListRow } from "@/presentation/components/ListRow";
import { PageHeader } from "@/presentation/components/PageHeader";
import { PlaceVenuePanel } from "@/presentation/components/PlaceVenuePanel";
import { Screen } from "@/presentation/components/Screen";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { useReceivedFriendRequests } from "@/presentation/hooks/useFriends";
import { countUpcomingInvitations, useCancelInvitation, useInvitationDetails, useReceivedInvitations } from "@/presentation/hooks/useInvitations";
import { useRouteId } from "@/presentation/hooks/useRouteId";
import { formatDateTime, formatTime } from "@/shared/date-format";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function CreatedInvitationDetailScreen() {
  const id = useRouteId();
  const invitation = useInvitationDetails(id);
  const cancelInvitation = useCancelInvitation(id ?? "");
  const receivedInvitations = useReceivedInvitations();
  const receivedFriendRequests = useReceivedFriendRequests();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const recipients = invitation.data?.recipients ?? [];
  const receivedInvitationCount = countUpcomingInvitations(receivedInvitations.data);
  const notificationCount = receivedInvitationCount + (receivedFriendRequests.data?.length ?? 0);
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
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => setMenuOpen((value) => !value)} style={styles.gearButton}>
          {menuOpen ? <X size={22} color={colors.ink} strokeWidth={3} /> : <Settings size={22} color={colors.ink} strokeWidth={3} />}
          {notificationCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{formatNotificationCount(notificationCount)}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      {menuOpen ? (
        <FluxMenu
          onClose={() => setMenuOpen(false)}
          receivedInvitationCount={receivedInvitationCount}
          receivedFriendRequestCount={receivedFriendRequests.data?.length ?? 0}
        />
      ) : null}
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

function FluxMenu({
  onClose,
  receivedInvitationCount,
  receivedFriendRequestCount
}: {
  onClose: () => void;
  receivedInvitationCount: number;
  receivedFriendRequestCount: number;
}) {
  const items = [
    { label: "Reçues", icon: Inbox, href: "/invitations/received", badgeCount: receivedInvitationCount },
    { label: "Créées", icon: Send, href: "/invitations/created", badgeCount: 0 },
    { label: "Amis", icon: Users, href: "/friends", badgeCount: receivedFriendRequestCount },
    { label: "Profil", icon: User, href: "/profile", badgeCount: 0 }
  ] as const;

  return (
    <View style={styles.menuPanel}>
      <View style={styles.menuHeader}>
        <Text style={styles.menuTitle}>Flux</Text>
        <View style={styles.menuRule} />
      </View>
      <View style={styles.menuItems}>
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Pressable
              key={item.href}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                router.push(item.href);
              }}
              style={styles.menuItem}
            >
              <Icon size={18} color={colors.ink} strokeWidth={3} />
              <Text style={styles.menuItemText}>{item.label}</Text>
              {item.badgeCount > 0 ? (
                <View style={styles.menuItemBadge}>
                  <Text style={styles.menuItemBadgeText}>{formatNotificationCount(item.badgeCount)}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
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

function formatNotificationCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-start"
  },
  gearButton: {
    position: "relative",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 0,
    elevation: 2
  },
  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: "900"
  },
  menuPanel: {
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    padding: spacing.md,
    gap: spacing.sm
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  menuTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  menuRule: {
    flex: 1,
    height: borders.regular,
    backgroundColor: colors.border
  },
  menuItems: {
    gap: spacing.xs
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  menuItemText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  menuItemBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5
  },
  menuItemBadgeText: {
    color: colors.white,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: "900"
  },
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
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
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
