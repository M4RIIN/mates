import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { useRegister } from "@/presentation/hooks/useAuth";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { colors, spacing } from "@/shared/theme";

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
      <View style={styles.header}>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Ton identifiant public sera généré automatiquement.</Text>
      </View>
      <TextField label="Pseudo" value={pseudo} onChangeText={setPseudo} placeholder="nicolas" />
      <TextField label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry placeholder="8 caractères minimum" />
      <AppButton
        title="Créer"
        onPress={submit}
        loading={register.isPending}
        disabled={pseudo.trim().length < 2 || password.length < 8}
        icon={<UserPlus size={18} color="#FFFFFF" />}
      />
      <Link href="/auth/login" style={styles.link}>
        J’ai déjà un compte
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
    fontSize: 30,
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
