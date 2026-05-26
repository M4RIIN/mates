import { useEffect, useRef, useState } from "react";
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { router } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { ArrowRight, Sparkles, Users, UtensilsCrossed } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { useAuthenticateWithGoogle, useCompleteGoogleProfile } from "@/presentation/hooks/useAuth";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { appConfig } from "@/shared/config";
import { borders, colors, radii, spacing } from "@/shared/theme";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_PLACEHOLDER = "missing-google-client-id.apps.googleusercontent.com";

const onboardingSlides = [
  {
    image: require("../../../../landing/src/assets/701368272_1033775492662256_4952283703477037679_n.jpg"),
    eyebrow: "Mates",
    title: "Rassemble ton crew en quelques gestes",
    body: "Crée des sorties spontanées et partage un cadre clair dès le premier message.",
    accent: colors.yellow,
    icon: Users
  },
  {
    image: require("../../../../landing/src/assets/703724960_1604647940607031_401902957970179084_n.jpg"),
    eyebrow: "Plan simple",
    title: "Choisis un lieu sans perdre la soirée",
    body: "L'app met l'invitation, les réponses et le contexte au même endroit.",
    accent: colors.red,
    icon: UtensilsCrossed
  },
  {
    image: require("../../../../landing/src/assets/705070811_27380084231627582_6238451061523032614_n.jpg"),
    eyebrow: "En direct",
    title: "Vois qui suit pendant que le plan se construit",
    body: "Les confirmations et les ajustements restent visibles sans fil de discussion infini.",
    accent: colors.primary,
    icon: Sparkles
  },
  {
    image: require("../../../../landing/src/assets/708087840_1339654864721943_1593232045811572547_n.jpg"),
    eyebrow: "Prêt",
    title: "Entre et commence avec Google",
    body: "Un seul bouton pour rejoindre l'app, puis ton profil public est créé si besoin.",
    accent: colors.green,
    icon: ArrowRight
  }
] as const;

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

export function LoginScreen() {
  const { width } = useWindowDimensions();
  const carouselRef = useRef<ScrollView | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
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

  const slideWidth = carouselWidth > 0 ? carouselWidth : width;

  function handleCarouselLayout(event: LayoutChangeEvent) {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0 && nextWidth !== carouselWidth) {
      setCarouselWidth(nextWidth);
    }
  }

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

  if (pendingGoogleIdToken !== null) {
    return (
      <Screen scroll={false} contentStyle={styles.profileContent}>
        <View style={styles.profileCard}>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>Dernière étape</Text>
          </View>
          <Text style={styles.profileTitle}>Choisis ton pseudo</Text>
          <Text style={styles.profileBody}>
            Ton identifiant public sera généré automatiquement au format pseudo#0000.
          </Text>
          <TextField label="Pseudo" value={pseudo} onChangeText={setPseudo} placeholder="nicolas" />
          <AppButton
            title="Créer mon profil"
            onPress={submitProfile}
            loading={completeGoogleProfile.isPending}
            disabled={pseudo.trim().length < 2}
            icon={<ArrowRight size={18} color={colors.white} strokeWidth={3} />}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentStyle={styles.screenContent} dismissKeyboardOnPress={false}>
      <View style={styles.hero}>
        <ScrollView
          ref={carouselRef}
          onLayout={handleCarouselLayout}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          disableIntervalMomentum
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
            setActiveIndex(nextIndex);
          }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          style={styles.carousel}
        >
          {onboardingSlides.map((slide, index) => {
            const Icon = slide.icon;

            return (
              <View key={slide.title} style={[styles.slide, { width: slideWidth }]}>
                <View pointerEvents="none" style={styles.imageFrame}>
                  <Image source={slide.image} style={styles.image} resizeMode="cover" />
                  <View pointerEvents="none" style={styles.imageOverlay} />
                  <View pointerEvents="none" style={[styles.imageChip, { backgroundColor: slide.accent }]}>
                    <Icon size={16} color={colors.ink} strokeWidth={2.5} />
                    <Text style={styles.imageChipText}>{slide.eyebrow}</Text>
                  </View>
                </View>
                <View pointerEvents="none" style={styles.copyBlock}>
                  <Text style={styles.stepText}>
                    {String(index + 1).padStart(2, "0")} / {String(onboardingSlides.length).padStart(2, "0")}
                  </Text>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.body}>{slide.body}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.bottomDock}>
        <View style={styles.pagination}>
          {onboardingSlides.map((slide, index) => (
            <View
              key={slide.title}
              style={[
                styles.paginationDot,
                index === activeIndex ? styles.paginationDotActive : null,
                index === activeIndex ? { backgroundColor: slide.accent } : null
              ]}
            />
          ))}
        </View>
        <Text style={styles.hint}>Glisse horizontalement pour découvrir l’app.</Text>
        <AppButton
          title="Se connecter avec Google"
          onPress={startGoogleSignIn}
          loading={authenticateWithGoogle.isPending}
          disabled={request === null}
          icon={<ArrowRight size={18} color={colors.white} strokeWidth={3} />}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: spacing.lg,
    gap: spacing.sm
  },
  hero: {
    flex: 1
  },
  carousel: {
    flex: 1
  },
  carouselContent: {
    flexGrow: 1
  },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    justifyContent: "center",
    gap: spacing.lg
  },
  imageFrame: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: borders.heavy,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    minHeight: 320,
    flex: 1,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 6
  },
  image: {
    width: "100%",
    height: "100%"
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(7, 26, 45, 0.16)"
  },
  imageChip: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: borders.regular,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  imageChipText: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  copyBlock: {
    gap: spacing.sm,
    paddingBottom: spacing.xs
  },
  stepText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700"
  },
  bottomDock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.sm
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.hairline
  },
  paginationDotActive: {
    width: 34
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  profileContent: {
    flex: 1,
    justifyContent: "center"
  },
  profileCard: {
    borderWidth: borders.regular,
    borderColor: colors.border,
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 0,
    elevation: 4
  },
  profileBadge: {
    alignSelf: "flex-start",
    borderWidth: borders.regular,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.yellow,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  profileBadgeText: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  profileTitle: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900"
  },
  profileBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700"
  }
});
