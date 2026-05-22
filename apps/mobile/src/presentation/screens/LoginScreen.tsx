import { useEffect, useRef, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { LogIn, UserPlus } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { PageHeader } from "@/presentation/components/PageHeader";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { useAuthenticateWithGoogle, useCompleteGoogleProfile } from "@/presentation/hooks/useAuth";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { appConfig } from "@/shared/config";
import { borders, colors, radii, spacing } from "@/shared/theme";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_PLACEHOLDER = "missing-google-client-id.apps.googleusercontent.com";

type LoginScreenProps = {
  title?: string;
  subtitle?: string;
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

export function LoginScreen({
  title = "Connexion",
  subtitle = "Connecte-toi avec ton compte Google."
}: LoginScreenProps) {
  const [pseudo, setPseudo] = useState("");
  const [pendingGoogleIdToken, setPendingGoogleIdToken] = useState<string | null>(null);
  const handledGoogleResponseRef = useRef<string | null>(null);
  const authenticateWithGoogle = useAuthenticateWithGoogle();
  const completeGoogleProfile = useCompleteGoogleProfile();
  const googleClientId = getGoogleClientIdForPlatform();
  const googleAuthConfigured = googleClientId !== undefined;
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
      <PageHeader
        eyebrow="Mates"
        title={needsProfile ? "Choisis ton pseudo" : title}
        subtitle={needsProfile ? "Ton tag public sera généré automatiquement." : subtitle}
        tone={needsProfile ? "yellow" : "blue"}
      />
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
          <AppButton
            title="Continuer avec Google"
            onPress={startGoogleSignIn}
            loading={authenticateWithGoogle.isPending}
            disabled={request === null}
            icon={<LogIn size={18} color={colors.white} strokeWidth={3} />}
          />
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
  }
});
