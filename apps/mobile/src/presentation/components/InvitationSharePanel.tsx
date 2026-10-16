import { useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/presentation/hooks/useApiClient";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { AppButton } from "./AppButton";
import { appConfig } from "@/shared/config";
import { colors, spacing, borders, radii } from "@/shared/theme";

export function InvitationSharePanel({ id, closed }: { id: string; closed: boolean }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const link = useQuery({ queryKey: ["invitation-share-link", id], queryFn: () => api.getInvitationShareLink(id), retry: false });
  const [action, setAction] = useState<"share" | "copy" | "revoke" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const lock = useRef(false);
  const busy = action !== null;

  async function share(mode: "share" | "copy") {
    if (lock.current) return;
    lock.current = true; setAction(mode); setError(null); setFeedback(null);
    try {
      let currentLink = link.data;
      // Re-sharing an older hidden-address link explicitly applies the new default.
      // Merely viewing the detail never changes an existing link's visibility.
      if (currentLink == null || (!closed && !currentLink.showAddress)) {
        currentLink = await api.enableInvitationShareLink(id);
        queryClient.setQueryData(["invitation-share-link", id], currentLink);
      }
      const url = `${appConfig.profileShareBaseUrl.replace(/\/$/, "")}/s/${currentLink.token}`;
      if (mode === "copy") {
        await Clipboard.setStringAsync(url);
        setFeedback("Lien copié !");
      } else {
        await Share.share({ message: `Tu viens ? Réponds à ma sortie Mates : ${url}` });
      }
    } catch (e) { setError(getErrorMessage(e)); }
    finally { lock.current = false; setAction(null); }
  }

  async function revoke() {
    if (lock.current) return;
    lock.current = true; setAction("revoke"); setError(null); setFeedback(null);
    try {
      await api.revokeInvitationShareLink(id);
      queryClient.setQueryData(["invitation-share-link", id], null);
      setRevokeOpen(false);
      setFeedback("Lien désactivé.");
    } catch (e) { setError(getErrorMessage(e)); }
    finally { lock.current = false; setAction(null); }
  }

  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>Inviter par lien</Text>
    <Text style={styles.text}>{closed ? "Cette sortie ne reçoit plus de réponses." : "Tes proches répondent sans compte. Le lien inclut le lieu, l’adresse exacte et l’heure."}</Text>
    {link.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {link.isError ? <AppButton title="Réessayer le partage" variant="secondary" onPress={() => { void link.refetch(); }} /> : null}
    {!revokeOpen && (error !== null || link.isError) ? <Text accessibilityRole="alert" style={styles.error}>{error ?? getErrorMessage(link.error)}</Text> : null}
    {link.isSuccess && (!closed || link.data !== null) ? <View style={styles.actions}>
      <View style={styles.action}><AppButton title="Partager" disabled={busy} loading={action === "share"} onPress={() => { void share("share"); }} /></View>
      <View style={styles.action}><AppButton title="Copier le lien" variant="secondary" disabled={busy} loading={action === "copy"} onPress={() => { void share("copy"); }} /></View>
    </View> : null}
    {link.isSuccess && link.data !== null ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }}
      disabled={busy} style={styles.revoke} onPress={() => { setError(null); setRevokeOpen(true); }}>
      <Text style={styles.revokeText}>Désactiver le lien</Text>
    </Pressable> : null}
    {feedback !== null ? <Text accessibilityLiveRegion="polite" style={styles.text}>{feedback}</Text> : null}
    <Modal transparent visible={revokeOpen} onRequestClose={() => { if (!busy) setRevokeOpen(false); }}>
      <View style={styles.scrim}><View accessibilityViewIsModal style={[styles.panel, { maxHeight: "90%" }]}>
        <Text accessibilityRole="header" style={styles.title}>Désactiver ce lien ?</Text>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: spacing.md }}><Text style={styles.text}>Ce lien ne fonctionnera plus. Les réponses sont conservées.</Text>
        {error !== null ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <AppButton title="Désactiver le lien" loading={busy} variant="danger" onPress={() => { void revoke(); }} />
        <AppButton title="Garder le lien" disabled={busy} variant="secondary" onPress={() => setRevokeOpen(false)} />
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceStrong, borderWidth: borders.regular, borderColor: colors.border, borderRadius: radii.md, maxWidth: 600, width: "100%" },
  title: { color: colors.text, fontSize: 19, fontWeight: "900" },
  text: { color: colors.text, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", gap: spacing.xs },
  action: { flex: 1 },
  revoke: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  revokeText: { color: colors.muted, fontSize: 13, fontWeight: "700", textDecorationLine: "underline" },
  error: { color: colors.red, fontSize: 14 },
  scrim: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.md, backgroundColor: colors.scrim }
});
