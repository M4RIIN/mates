import { router, usePathname } from "expo-router";
import { CalendarDays, Send, Users, UserRound } from "lucide-react-native";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { countPendingInvitations } from "@/domain/invitation/status";
import { useReceivedInvitations } from "@/presentation/hooks/useInvitations";
import { useReceivedFriendRequests } from "@/presentation/hooks/useFriends";
import { useInvitationClock } from "@/presentation/hooks/useInvitationClock";
import { borders, colors, layout, radii, spacing } from "@/shared/theme";

export function ProfileHeaderButton() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir mon profil"
      onPress={() => { Keyboard.dismiss(); router.navigate("/profile"); }}
      style={({ pressed }) => [styles.profile, pressed && styles.pressed]}>
      <UserRound size={19} color={colors.ink} strokeWidth={2.5} />
      <Text style={styles.profileLabel}>Profil</Text>
    </Pressable>
  );
}

export function AppNavigation() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const invitations = useReceivedInvitations();
  const requests = useReceivedFriendRequests();
  const now = useInvitationClock();
  const items = [
    { label: "Sorties", href: "/sorties", icon: CalendarDays,
      active: pathname === "/sorties" || pathname.startsWith("/invitations/"),
      count: countPendingInvitations(invitations.data, now) },
    { label: "Proposer", href: "/home", icon: Send, active: pathname === "/home", count: 0 },
    { label: "Amis", href: "/friends", icon: Users, active: pathname.startsWith("/friends"),
      count: requests.data?.length ?? 0 }
  ] as const;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
      <View style={styles.items}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Pressable key={item.href} accessibilityRole="tab"
              accessibilityState={{ selected: item.active }}
              accessibilityLabel={`${item.label}${item.count > 0 ? `, ${item.count} ${item.label === "Sorties" ? "invitations à répondre" : "demandes d’amitié"}` : ""}`}
              onPress={() => { Keyboard.dismiss(); router.navigate(item.href); }}
              style={({ pressed }) => [styles.item, item.active && styles.active, pressed && styles.pressed]}>
              <View style={styles.icon}>
                <Icon size={22} color={item.active ? colors.primary : colors.ink} strokeWidth={2.5} />
                {item.count > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{item.count > 99 ? "99+" : item.count}</Text></View> : null}
              </View>
              <Text style={[styles.label, item.active && styles.activeLabel]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopWidth: borders.regular, borderTopColor: colors.border,
    paddingTop: spacing.xs, paddingHorizontal: spacing.sm },
  items: { flexDirection: "row", gap: spacing.xs, width: "100%", maxWidth: layout.maxWidth, alignSelf: "center" },
  item: { flex: 1, minHeight: 58, justifyContent: "center", alignItems: "center", gap: 5,
    borderRadius: radii.md, borderWidth: borders.regular, borderColor: "transparent" },
  active: { backgroundColor: colors.blueSoft, borderColor: colors.primary },
  pressed: { opacity: 0.7 },
  label: { fontSize: 12, fontWeight: "800", color: colors.ink },
  activeLabel: { color: colors.primary },
  icon: { position: "relative" },
  badge: { position: "absolute", top: -6, left: 17, minWidth: 19, minHeight: 19,
    paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderRadius: radii.pill,
    backgroundColor: colors.red, borderWidth: 1, borderColor: colors.surface },
  badgeText: { color: colors.white, fontWeight: "900", fontSize: 10 },
  profile: { minHeight: 44, paddingHorizontal: spacing.sm, flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: radii.pill, backgroundColor: colors.yellowSoft },
  profileLabel: { color: colors.ink, fontSize: 12, fontWeight: "800" }
});
