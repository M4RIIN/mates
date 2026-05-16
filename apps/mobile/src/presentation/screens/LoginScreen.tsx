import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Link, router } from "expo-router";
import { LogIn } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { useLogin } from "@/presentation/hooks/useAuth";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  async function submit() {
    try {
      await login.mutateAsync({ identifier: identifier.trim(), password });
      router.replace("/home");
    } catch (error: unknown) {
      Alert.alert("Connexion impossible", getErrorMessage(error));
    }
  }

  return (
    <Screen>
      <PageHeader eyebrow="Mates" title="Connexion" subtitle="Entre avec ton identifiant public." tone="blue" />
      <View style={styles.formPanel}>
        <View pointerEvents="none" style={styles.formAccent} />
        <TextField label="Identifiant public" value={identifier} onChangeText={setIdentifier} placeholder="pseudo#7647" />
        <TextField label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
        <AppButton
          title="Connexion"
          onPress={submit}
          loading={login.isPending}
          disabled={identifier.trim().length === 0 || password.length === 0}
          icon={<LogIn size={18} color={colors.white} strokeWidth={3} />}
        />
        <Link href="/auth/register" style={styles.link}>
          Créer un compte
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
    top: -26,
    right: -18,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.blueSoft
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
