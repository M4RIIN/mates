import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Link, router } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { useRegister } from "@/presentation/hooks/useAuth";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function RegisterScreen() {
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const register = useRegister();

  async function submit() {
    try {
      const response = await register.mutateAsync({ pseudo: pseudo.trim(), password });
      Alert.alert("Compte créé", `Ton identifiant public est ${response.user.publicTag}`);
      router.replace("/home");
    } catch (error: unknown) {
      Alert.alert("Inscription impossible", getErrorMessage(error));
    }
  }

  return (
    <Screen>
      <PageHeader eyebrow="Nouveau mate" title="Créer un compte" subtitle="Ton identifiant public sera généré automatiquement." tone="yellow" />
      <View style={styles.formPanel}>
        <View pointerEvents="none" style={styles.formAccent} />
        <TextField label="Pseudo" value={pseudo} onChangeText={setPseudo} placeholder="nicolas" />
        <TextField label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry placeholder="8 caractères minimum" />
        <AppButton
          title="Créer"
          onPress={submit}
          loading={register.isPending}
          disabled={pseudo.trim().length < 2 || password.length < 8}
          icon={<UserPlus size={18} color={colors.white} strokeWidth={3} />}
        />
        <Link href="/auth/login" style={styles.link}>
          J’ai déjà un compte
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  formPanel: {
    position: "relative",
    overflow: "hidden",
    borderWidth: borders.regular,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md
  },
  formAccent: {
    position: "absolute",
    top: -28,
    right: -12,
    width: 104,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.yellowSoft,
    transform: [{ rotate: "-10deg" }]
  },
  link: {
    color: colors.text,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
    borderWidth: borders.regular,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.md
  }
});
