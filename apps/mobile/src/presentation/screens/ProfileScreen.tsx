import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { useCurrentUser, useLogout } from "@/presentation/hooks/useAuth";
import { useAuthStore } from "@/infrastructure/storage/auth-store";
import { borders, colors, radii, spacing } from "@/shared/theme";

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
      <PageHeader eyebrow="Compte" title="Profil" subtitle="Identité publique" tone="blue" compact />
      <View style={styles.panel}>
        <View style={styles.identityRow}>
          <View style={styles.identityShape} />
          <View style={styles.identityCopy}>
            <Text style={styles.label}>Pseudo</Text>
            <Text style={styles.value}>{user?.pseudo ?? "-"}</Text>
          </View>
        </View>
        <View style={styles.tagBlock}>
          <Text style={styles.label}>Identifiant public</Text>
          <Text selectable style={styles.publicTag}>
            {user?.publicTag ?? "-"}
          </Text>
        </View>
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
        icon={<LogOut size={18} color={colors.ink} strokeWidth={3} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: borders.regular,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  identityShape: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    borderWidth: borders.regular,
    borderColor: colors.border
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xs
  },
  tagBlock: {
    borderTopWidth: borders.regular,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.xs
  },
  label: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  value: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900"
  },
  publicTag: {
    color: colors.red,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900"
  }
});
