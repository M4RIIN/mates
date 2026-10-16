import { getAnalyticsBrowserId } from "@/infrastructure/storage/analytics-browser-id";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { useQuery } from "@tanstack/react-query";
import { getInvitationState, isInvitationOpen, type GuestResponseDto } from "@mates/shared";
import { useInvitationClock } from "@/presentation/hooks/useInvitationClock";
import { ApiClientError } from "@/infrastructure/api/api-client";
import { useApiClient } from "@/presentation/hooks/useApiClient";
import { useAuthStore } from "@/infrastructure/storage/auth-store";
import { Screen } from "@/presentation/components/Screen";
import { PageHeader } from "@/presentation/components/PageHeader";
import { AppButton } from "@/presentation/components/AppButton";
import { TextField } from "@/presentation/components/TextField";
import { LoginScreen } from "./LoginScreen";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { formatDateTime } from "@/shared/date-format";
import { colors, spacing, borders, radii } from "@/shared/theme";

export function SharedInvitationScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = typeof params.token === "string" ? params.token : "";
  return <SharedInvitationContent key={token} token={token} />;
}

function SharedInvitationContent({ token }: { token: string }) {
  const valid = /^[a-f0-9]{64}$/.test(token);
  const api = useApiClient();
  const authToken = useAuthStore(s => s.token);
  const invitation = useQuery({ queryKey: ["shared-invitation", token], queryFn: () => api.getSharedInvitation(token), enabled: valid, retry: false, refetchInterval: 30000 });
  const [guestKey, setGuestKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [response, setResponse] = useState<GuestResponseDto | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingIdentity, setLoadingIdentity] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const [login, setLogin] = useState(false);
  const inFlight = useRef(false);
  const unavailable = invitation.error instanceof ApiClientError && (invitation.error.status === 400 || invitation.error.status === 404);
  const id = invitation.data?.id;
  const now = useInvitationClock();
  const state = invitation.data === undefined ? undefined : getInvitationState(invitation.data, now);
  const closed = invitation.data === undefined || invitation.data.closed || !isInvitationOpen(invitation.data, now);

  useEffect(() => {
    let disposed = false;
    setGuestKey(null); setResponse(null); setName(""); setEditing(false); setError(null); setLoadingIdentity(true);
    if (id === undefined) return;
    async function restore() {
      try {
        const storageKey = `mates:guest-response:${id}`;
        let key = await AsyncStorage.getItem(storageKey);
        if (key === null || !/^[a-f0-9]{64}$/.test(key)) {
          key = Array.from(await Crypto.getRandomBytesAsync(32), b => b.toString(16).padStart(2, "0")).join("");
          await AsyncStorage.setItem(storageKey, key);
        }
        const previous = await api.getGuestResponse(token, key);
        if (disposed) return;
        setGuestKey(key); setResponse(previous); setName(previous?.name ?? "");
      } catch (e) {
        if (!disposed) setError(`Impossible de retrouver ou mémoriser ta réponse : ${getErrorMessage(e)}`);
      } finally { if (!disposed) setLoadingIdentity(false); }
    }
    void restore();
    return () => { disposed = true; };
  }, [id, token, api, retry]);

  async function submit(status: "yes" | "no") {
    if (guestKey === null || inFlight.current || name.trim().length < 2 || invitation.data === undefined || invitation.data.closed || !isInvitationOpen(invitation.data)) return;
    inFlight.current = true; setSaving(true); setError(null);
    try {
      const analyticsBrowserId = await getAnalyticsBrowserId();
      const saved = await api.respondAsGuest(token, { guestKey, name: name.trim(), status, ...(analyticsBrowserId !== undefined ? { analyticsBrowserId } : {}) });
      setResponse(saved); setName(saved.name); setEditing(false);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { inFlight.current = false; setSaving(false); void invitation.refetch(); }
  }

  if (login && authToken === null) return <LoginScreen returnTo="/home" returnHint="Après connexion ou inscription, prépare ta prochaine sortie. Ta réponse précédente reste enregistrée." />;
  return <Screen>
    <PageHeader eyebrow="Mates" title="Tu viens ?" subtitle="Réponds à la sortie, sans compte ni installation." compact />
    {!valid ? <Text accessibilityRole="alert" style={styles.error}>Ce lien d’invitation est invalide.</Text> : null}
    {invitation.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {invitation.isError ? <View style={styles.panel}><Text accessibilityRole="alert" style={styles.error}>{getErrorMessage(invitation.error)}</Text>{!unavailable ? <AppButton title="Réessayer" variant="secondary" onPress={() => { void invitation.refetch(); }} /> : null}</View> : null}
    {invitation.data !== undefined && !invitation.isError ? <>
      <View style={styles.panel}>
        <Text accessibilityRole="header" style={styles.title}>{invitation.data.placeName}</Text>
        <Text style={styles.text}>{formatDateTime(invitation.data.scheduledAt)}</Text>
        <Text style={styles.text}>Proposée par {invitation.data.creatorPseudo}</Text>
        <Text style={styles.muted}>{invitation.data.placeAddress ?? (invitation.data.showAddress ? "Adresse non renseignée." : "Adresse non partagée : demande-la à l’organisateur.")}</Text>
      </View>
      {state === "ongoing" && !closed ? <Text accessibilityLiveRegion="polite" style={styles.text}>Sortie en cours</Text> : null}
      {closed ? <Text accessibilityLiveRegion="polite" style={styles.text}>{invitation.data.canceledAt !== null ? "Cette sortie a été annulée." : "Cette sortie est terminée et ne reçoit plus de réponses."}</Text> : null}
      {loadingIdentity ? <ActivityIndicator accessibilityLabel="Recherche de ta réponse" color={colors.primary} /> : null}
      {error !== null ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
      {!loadingIdentity && guestKey === null ? <AppButton title="Retrouver ma réponse" onPress={() => setRetry(v => v + 1)} /> : null}
      {response !== null && !editing ? <View style={styles.panel}>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.title}>Réponse enregistrée</Text>
        <Text style={styles.text}>{response.name} · {response.responseStatus === "yes" ? "Tu viens !" : "Tu ne peux pas venir."}</Text>
        {!closed ? <AppButton title="Modifier ma réponse" variant="secondary" onPress={() => setEditing(true)} /> : null}
      </View> : null}
      {!closed && guestKey !== null && (response === null || editing) ? <View style={styles.panel}>
        <TextField label="Ton prénom" accessibilityLabel="Ton prénom" autoCapitalize="words" maxLength={40} value={name} onChangeText={setName} editable={!saving} placeholder="Ex. Camille" />
        {name.trim().length < 2 ? <Text style={styles.muted}>Entre un prénom d’au moins 2 caractères pour répondre.</Text> : null}
        <AppButton title="Je viens" onPress={() => { void submit("yes"); }} disabled={saving || name.trim().length < 2} loading={saving} />
        <AppButton title="Je ne peux pas" variant="secondary" onPress={() => { void submit("no"); }} disabled={saving || name.trim().length < 2} />
      </View> : null}
      <Text style={styles.muted}>Prénom non vérifié. Ta réponse est mémorisée sur ce navigateur. Un identifiant aléatoire permet aussi d’estimer les participations uniques entre sorties ; seul son hash est conservé en base. Sur un autre appareil, ou après effacement du stockage, tu pourrais apparaître deux fois.</Text>
      {response !== null ? <View style={styles.panel}><Text style={styles.text}>À toi de proposer la prochaine sortie ?</Text><AppButton title="Organiser ma prochaine sortie" variant="secondary" onPress={() => { if (authToken !== null) router.push("/home"); else setLogin(true); }} /></View> : null}
    </> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  panel: { gap: spacing.md, padding: spacing.md, borderWidth: borders.regular, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  title: { fontSize: 22, fontWeight: "900", color: colors.text },
  text: { fontSize: 16, lineHeight: 23, color: colors.text },
  muted: { fontSize: 13, lineHeight: 19, color: colors.muted },
  error: { fontSize: 14, lineHeight: 20, color: colors.red }
});
