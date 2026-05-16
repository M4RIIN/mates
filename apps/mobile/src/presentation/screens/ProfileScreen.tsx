import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { Screen } from "@/presentation/components/Screen";
import { useCurrentUser, useLogout } from "@/presentation/hooks/useAuth";
import { useAuthStore } from "@/infrastructure/storage/auth-store";
import { colors, spacing } from "@/shared/theme";

export function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  useCurrentUser();

  async function submitLogout() {
    await logout();
    router.replace("/auth/login");
  }

  return (
    <Screen>
      <Text style={styles.title}>Profil</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Pseudo</Text>
        <Text style={styles.value}>{user?.pseudo ?? "-"}</Text>
        <Text style={styles.label}>Identifiant public</Text>
        <Text selectable style={styles.publicTag}>
          {user?.publicTag ?? "-"}
        </Text>
      </View>
      <AppButton
        title="Déconnexion"
        onPress={() => {
          Alert.alert("Déconnexion", "Fermer la session sur cet appareil ?", [
            { text: "Annuler", style: "cancel" },
            { text: "Déconnexion", style: "destructive", onPress: submitLogout }
          ]);
        }}
        variant="secondary"
        icon={<LogOut size={18} color="#FFFFFF" />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900"
  },
  card: {
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  value: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.sm
  },
  publicTag: {
    color: colors.red,
    fontSize: 28,
    fontWeight: "900"
  }
});
