import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/presentation/hooks/useApiClient";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { AppButton } from "./AppButton";
import { appConfig } from "@/shared/config";
import { colors, spacing, borders, radii } from "@/shared/theme";

export function InvitationSharePanel({ id, closed }: { id: string; closed: boolean }) {
  const api = useApiClient();
  const link = useQuery({ queryKey: ["invitation-share-link", id], queryFn: () => api.getInvitationShareLink(id), retry: false });
  const [showAddress, setShowAddress] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const lock = useRef(false);
  useEffect(() => { setShowAddress(link.data?.showAddress ?? false); }, [link.data]);
  const dirty = link.data != null && showAddress !== link.data.showAddress;
  const url = link.data ? `${appConfig.profileShareBaseUrl.replace(/\/$/, "")}/s/${link.data.token}` : null;

  async function change(revoke: boolean) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setFeedback(null);
    try {
      if (revoke) await api.revokeInvitationShareLink(id);
      else await api.enableInvitationShareLink(id, showAddress);
      await link.refetch(); setRevokeOpen(false);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { lock.current = false; setBusy(false); }
  }

  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>Inviter par lien</Text>
    <Text style={styles.text}>Tes proches répondent sur le web avec leur prénom, sans installer Mates. Leurs prénoms ne sont pas vérifiés.</Text>
    <Text style={styles.text}>Toute personne possédant le lien voit le lieu, l’heure et ton pseudo. L’adresse exacte est masquée par défaut ; le nom du lieu peut suffire à le reconnaître.</Text>
    {link.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {link.isError ? <AppButton title="Réessayer le partage" variant="secondary" onPress={() => { void link.refetch(); }} /> : null}
    {error !== null || link.isError ? <Text accessibilityRole="alert" style={styles.error}>{error ?? getErrorMessage(link.error)}</Text> : null}
    {!closed && link.isSuccess ? <>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: showAddress, disabled: busy }} disabled={busy} onPress={() => setShowAddress(v => !v)} style={styles.checkbox}>
        <Text style={styles.text}>{showAddress ? "☑" : "☐"} Afficher l’adresse exacte dans le lien</Text>
      </Pressable>
      {link.data === null || showAddress !== link.data?.showAddress ? <AppButton title={link.data === null ? "Créer le lien d’invitation" : "Enregistrer la visibilité de l’adresse"} loading={busy} onPress={() => { void change(false); }} /> : null}
    </> : null}
    {url !== null && !link.isError ? <>
      {dirty ? <Text style={styles.text}>Enregistre la visibilité de l’adresse avant de copier ou partager le lien. Le lien déjà envoyé conserve son réglage précédent jusque-là.</Text> : null}
      <Text selectable style={styles.url}>{url}</Text>
      <AppButton title="Copier le lien" variant="secondary" disabled={busy || dirty} onPress={() => { void Clipboard.setStringAsync(url).then(() => setFeedback("Lien copié !"), e => setError(getErrorMessage(e))); }} />
      <AppButton title="Partager l’invitation" disabled={busy || dirty} onPress={() => { void Share.share({ message: `Tu viens ? Réponds à ma sortie Mates : ${url}` }).catch(e => setError(getErrorMessage(e))); }} />
      <AppButton title="Désactiver le lien" variant="secondary" disabled={busy} onPress={() => { setError(null); setRevokeOpen(true); }} />
    </> : null}
    {closed ? <Text style={styles.text}>Cette sortie ne reçoit plus de réponses.</Text> : null}
    {feedback !== null ? <Text accessibilityLiveRegion="polite" style={styles.text}>{feedback}</Text> : null}
    <Modal transparent visible={revokeOpen} onRequestClose={() => { if (!busy) setRevokeOpen(false); }}>
      <View style={styles.scrim}><View accessibilityViewIsModal style={[styles.panel, { maxHeight: "90%" }]}>
        <Text accessibilityRole="header" style={styles.title}>Désactiver ce lien ?</Text>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: spacing.md }}><Text style={styles.text}>Il ne permettra plus de voir la sortie ni de répondre. Les réponses déjà reçues sont conservées. Un nouveau partage créera un autre lien.</Text>
        {error !== null ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <AppButton title="Désactiver le lien" loading={busy} variant="danger" onPress={() => { void change(true); }} />
        <AppButton title="Garder le lien" disabled={busy} variant="secondary" onPress={() => setRevokeOpen(false)} />
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceStrong, borderWidth: borders.regular, borderColor: colors.border, borderRadius: radii.md, maxWidth: 600, width: "100%" },
  title: { color: colors.text, fontSize: 19, fontWeight: "900" },
  text: { color: colors.text, fontSize: 14, lineHeight: 20 },
  url: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  checkbox: { minHeight: 44, justifyContent: "center" },
  error: { color: colors.red, fontSize: 14 },
  scrim: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.md, backgroundColor: colors.scrim }
});
