import { useEffect, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { LogIn, UserPlus } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { useAuthenticateWithGoogle, useCompleteGoogleProfile, useLogin, useRegister } from "@/presentation/hooks/useAuth";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { appConfig } from "@/shared/config";
import { borders, colors, radii, spacing } from "@/shared/theme";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_PLACEHOLDER = "missing-google-client-id.apps.googleusercontent.com";

type LoginScreenProps = {
  mode?: "login" | "register";
};

function getGoogleClientIdForPlatform(): string | undefined {
  if (Platform.OS === "ios") {
    return appConfig.googleIosClientId;
  }

  if (Platform.OS === "android") {
    return appConfig.googleAndroidClientId;
  }

  return appConfig.googleWebClientId;
}

function getGoogleUrlScheme(clientId: string): string {
  return `com.googleusercontent.apps.${clientId.replace(".apps.googleusercontent.com", "")}`;
}

function getGoogleRedirectUriForPlatform(): string | undefined {
  if (Platform.OS === "ios" && appConfig.googleIosClientId !== undefined) {
    return `${getGoogleUrlScheme(appConfig.googleIosClientId)}:/oauthredirect`;
  }

  return undefined;
}

export function LoginScreen({ mode = "login" }: LoginScreenProps) {
  const [identifier, setIdentifier] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [pendingGoogleIdToken, setPendingGoogleIdToken] = useState<string | null>(null);
  const handledGoogleResponseRef = useRef<string | null>(null);
  const login = useLogin();
  const register = useRegister();
  const authenticateWithGoogle = useAuthenticateWithGoogle();
  const completeGoogleProfile = useCompleteGoogleProfile();
  const passwordAuthEnabled = appConfig.passwordAuthEnabled;
  const googleClientId = getGoogleClientIdForPlatform();
  const googleAuthConfigured = googleClientId !== undefined;
  const googleAuthEnabled = googleAuthConfigured;
  const googleRedirectUri = getGoogleRedirectUriForPlatform();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    googleRedirectUri === undefined
      ? {
          webClientId: appConfig.googleWebClientId ?? GOOGLE_CLIENT_ID_PLACEHOLDER,
          iosClientId: appConfig.googleIosClientId ?? GOOGLE_CLIENT_ID_PLACEHOLDER,
          androidClientId: appConfig.googleAndroidClientId ?? GOOGLE_CLIENT_ID_PLACEHOLDER,
          selectAccount: true
        }
      : {
          webClientId: appConfig.googleWebClientId ?? GOOGLE_CLIENT_ID_PLACEHOLDER,
          iosClientId: appConfig.googleIosClientId ?? GOOGLE_CLIENT_ID_PLACEHOLDER,
          androidClientId: appConfig.googleAndroidClientId ?? GOOGLE_CLIENT_ID_PLACEHOLDER,
          redirectUri: googleRedirectUri,
          selectAccount: true
        },
    googleRedirectUri === undefined ? {} : { native: googleRedirectUri }
  );
  const needsProfile = pendingGoogleIdToken !== null;
  const isRegisterMode = mode === "register";
  const hasAnyAuthMethod = passwordAuthEnabled || googleAuthEnabled;
  const title = needsProfile ? "Choisis ton pseudo" : isRegisterMode ? "Créer un compte" : "Connexion";
  const subtitle = needsProfile
    ? "Ton tag public sera généré automatiquement."
    : isRegisterMode
      ? "Inscris-toi avec un mot de passe ou avec Google."
      : "Connecte-toi avec ton identifiant et ton mot de passe, ou avec Google.";

  async function authenticate(idToken: string) {
    try {
      const result = await authenticateWithGoogle.mutateAsync({ idToken });

      if (result.status === "authenticated") {
        router.replace("/home");
        return;
      }

      setPendingGoogleIdToken(idToken);
    } catch (error: unknown) {
      Alert.alert("Connexion Google impossible", getErrorMessage(error));
    }
  }

  useEffect(() => {
    if (response === null) {
      return;
    }

    const responseKey =
      response.type === "success" || response.type === "error" ? response.url : response.type;
    if (handledGoogleResponseRef.current === responseKey) {
      return;
    }

    handledGoogleResponseRef.current = responseKey;

    if (response.type === "success") {
      const idToken = response.params.id_token;
      if (idToken === undefined || idToken.length === 0) {
        Alert.alert("Connexion Google impossible", "Google n’a pas renvoyé de jeton d’identité.");
        return;
      }

      void authenticate(idToken);
      return;
    }

    if (response.type === "error") {
      Alert.alert("Connexion Google impossible", response.error?.message ?? "La connexion Google a échoué.");
    }
  }, [response]);

  async function submitPasswordAuth() {
    try {
      if (isRegisterMode) {
        await register.mutateAsync({
          pseudo: pseudo.trim(),
          password
        });
      } else {
        await login.mutateAsync({
          identifier: identifier.trim(),
          password
        });
      }

      router.replace("/home");
    } catch (error: unknown) {
      Alert.alert(isRegisterMode ? "Inscription impossible" : "Connexion impossible", getErrorMessage(error));
    }
  }

  async function startGoogleSignIn() {
    if (!googleAuthConfigured) {
      Alert.alert("Google non configuré", "Ajoute l’identifiant client OAuth Google dans le fichier .env mobile.");
      return;
    }

    await promptAsync();
  }

  async function submitProfile() {
    if (pendingGoogleIdToken === null) {
      return;
    }

    try {
      await completeGoogleProfile.mutateAsync({
        idToken: pendingGoogleIdToken,
        pseudo: pseudo.trim()
      });
      router.replace("/home");
    } catch (error: unknown) {
      Alert.alert("Création impossible", getErrorMessage(error));
    }
  }

  return (
    <Screen>
      <PageHeader eyebrow="Mates" title={title} subtitle={subtitle} tone={needsProfile ? "yellow" : "blue"} />
      <View style={styles.formPanel}>
        <View pointerEvents="none" style={styles.formAccent} />
        {needsProfile ? (
          <>
            <TextField label="Pseudo" value={pseudo} onChangeText={setPseudo} placeholder="nicolas" />
            <Text style={styles.helper}>La recherche d’amis restera disponible avec ton identifiant public pseudo#0000.</Text>
            <AppButton
              title="Créer mon profil"
              onPress={submitProfile}
              loading={completeGoogleProfile.isPending}
              disabled={pseudo.trim().length < 2}
              icon={<UserPlus size={18} color={colors.white} strokeWidth={3} />}
            />
          </>
        ) : (
          <>
            {!hasAnyAuthMethod ? <Text style={styles.helper}>Aucune méthode de connexion n’est activée dans l’environnement.</Text> : null}
            {passwordAuthEnabled ? (
              <>
                {isRegisterMode ? (
                  <TextField label="Pseudo" value={pseudo} onChangeText={setPseudo} placeholder="nicolas" />
                ) : (
                  <TextField
                    label="Identifiant public"
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder="nicolas#0047"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                )}
                <TextField
                  label="Mot de passe"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Au moins 8 caractères"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <AppButton
                  title={isRegisterMode ? "Créer mon compte" : "Se connecter"}
                  onPress={submitPasswordAuth}
                  loading={login.isPending || register.isPending}
                  disabled={
                    isRegisterMode
                      ? pseudo.trim().length < 2 || password.length < 8
                      : identifier.trim().length < 2 || password.length < 8
                  }
                  icon={
                    isRegisterMode ? (
                      <UserPlus size={18} color={colors.white} strokeWidth={3} />
                    ) : (
                      <LogIn size={18} color={colors.white} strokeWidth={3} />
                    )
                  }
                />
              </>
            ) : null}
            {passwordAuthEnabled && googleAuthEnabled ? <View style={styles.separator} /> : null}
            {googleAuthEnabled ? (
              <AppButton
                title="Continuer avec Google"
                onPress={startGoogleSignIn}
                loading={authenticateWithGoogle.isPending}
                disabled={request === null}
                variant={passwordAuthEnabled ? "secondary" : "primary"}
                icon={<LogIn size={18} color={passwordAuthEnabled ? colors.ink : colors.white} strokeWidth={3} />}
              />
            ) : null}
            {passwordAuthEnabled ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  router.push(isRegisterMode ? "/auth/login" : "/auth/register");
                }}
              >
                <Text style={styles.switchText}>
                  {isRegisterMode ? "Tu as déjà un compte ? Se connecter" : "Pas encore de compte ? S’inscrire"}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
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
  helper: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },
  separator: {
    height: 1,
    backgroundColor: colors.hairline
  },
  switchText: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    textAlign: "center"
  }
});
