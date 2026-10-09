import { useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { profileLink } from "@/domain/profile-links";
import { appConfig } from "@/shared/config";
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
  const [message, setMessage] = useState<string | null>(null);
  let link: string | null = null;
  try { if (user?.publicTag) link = profileLink(user.publicTag, appConfig.profileShareBaseUrl); } catch { /* Keep identifier available if config is invalid. */ }

  async function copy(value: string, label: string) {
    try {
      const copied = await Clipboard.setStringAsync(value);
      setMessage(copied ? label : "Copie impossible. Sélectionne le texte pour le copier.");
    } catch { setMessage("Copie impossible. Sélectionne le texte pour le copier."); }
  }
  async function shareProfile() {
    if (!link) return;
    try { await Share.share({ message: `Retrouve-moi sur Mates : ${link}\nMon identifiant : ${user?.publicTag}` }); }
    catch { setMessage("Partage impossible. Tu peux copier le lien ci-dessous."); }
  }

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
      {user?.publicTag ? <AppButton title="Copier mon identifiant" variant="secondary" onPress={() => { void copy(user.publicTag, "Identifiant copié."); }} /> : null}
      {link ? <View style={styles.panel}>
        <Text style={styles.label}>Partager mon profil</Text>
        <Text style={styles.help}>Ton ami ouvre ce lien ou scanne ce QR code, puis choisit de t’envoyer une demande.</Text>
        <View accessible accessibilityRole="image" accessibilityLabel="QR code de mon profil, également disponible par le lien et le bouton Copier" style={styles.qr}>
          <QRCode value={link} size={180} quietZone={12} ecl="M" color="#000000" backgroundColor="#ffffff" />
        </View>
        <Text selectable style={styles.help}>{link}</Text>
        <AppButton title="Partager mon profil" onPress={shareProfile} />
        <AppButton title="Copier le lien" variant="secondary" onPress={() => { void copy(link, "Lien copié."); }} />
      </View> : <Text style={styles.help}>Le partage par lien n’est pas disponible. Utilise ton identifiant public.</Text>}
      {message ? <Text accessibilityLiveRegion="polite" style={styles.help}>{message}</Text> : null}
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
  qr: { alignSelf: "center", backgroundColor: "#ffffff", padding: 4 },
  help: { color: colors.text, fontSize: 14, lineHeight: 21 },
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
