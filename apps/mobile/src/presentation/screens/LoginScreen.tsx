import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { LogIn } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { useLogin } from "@/presentation/hooks/useAuth";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { colors, spacing } from "@/shared/theme";

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
      <View style={styles.header}>
        <Text style={styles.title}>Mates</Text>
        <Text style={styles.subtitle}>Connecte-toi avec ton identifiant public.</Text>
      </View>
      <TextField label="Identifiant public" value={identifier} onChangeText={setIdentifier} placeholder="pseudo#7647" />
      <TextField label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
      <AppButton
        title="Connexion"
        onPress={submit}
        loading={login.isPending}
        disabled={identifier.trim().length === 0 || password.length === 0}
        icon={<LogIn size={18} color="#FFFFFF" />}
      />
      <Link href="/auth/register" style={styles.link}>
        Créer un compte
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md
  },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
    textAlign: "center",
    padding: spacing.md
  }
});
