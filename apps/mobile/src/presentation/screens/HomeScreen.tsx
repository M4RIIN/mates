import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Bell, CalendarPlus, Inbox, Send, User, Users } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { Screen } from "@/presentation/components/Screen";
import { useCurrentUser } from "@/presentation/hooks/useAuth";
import { useRegisterPushNotifications } from "@/presentation/hooks/usePushNotifications";
import { useAuthStore } from "@/infrastructure/storage/auth-store";
import { colors, spacing } from "@/shared/theme";

export function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  useCurrentUser();
  useRegisterPushNotifications();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Connecté</Text>
        <Text style={styles.title}>{user?.pseudo ?? "Mates"}</Text>
        <Text style={styles.subtitle}>{user?.publicTag ?? ""}</Text>
      </View>

      <View style={styles.actions}>
        <AppButton
          title="Créer une invitation"
          onPress={() => router.push("/create-call")}
          variant="danger"
          icon={<CalendarPlus size={18} color="#FFFFFF" />}
        />
        <AppButton
          title="Invitations reçues"
          onPress={() => router.push("/invitations/received")}
          icon={<Inbox size={18} color="#FFFFFF" />}
        />
        <AppButton
          title="Invitations créées"
          onPress={() => router.push("/invitations/created")}
          variant="secondary"
          icon={<Send size={18} color="#FFFFFF" />}
        />
        <AppButton title="Amis" onPress={() => router.push("/friends")} icon={<Users size={18} color="#FFFFFF" />} />
        <AppButton
          title="Profil"
          onPress={() => router.push("/profile")}
          variant="secondary"
          icon={<User size={18} color="#FFFFFF" />}
        />
      </View>

      <View style={styles.pushLine}>
        <Bell size={16} color={colors.muted} />
        <Text style={styles.pushText}>Les notifications sont enregistrées automatiquement après autorisation.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md
  },
  eyebrow: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 13
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16
  },
  actions: {
    gap: spacing.md
  },
  pushLine: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  pushText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13
  }
});
