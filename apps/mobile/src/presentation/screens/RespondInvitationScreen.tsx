import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Check, Clock3, X } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { PageHeader } from "@/presentation/components/PageHeader";
import { PlaceVenuePanel } from "@/presentation/components/PlaceVenuePanel";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { endInvitationLiveActivity, syncInvitationLiveActivity } from "@/infrastructure/live-activities/invitation-live-activity";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { useInvitationDetails, useRespondToInvitation } from "@/presentation/hooks/useInvitations";
import { useInvitationClock } from "@/presentation/hooks/useInvitationClock";
import { useRouteId } from "@/presentation/hooks/useRouteId";
import { openDirectionsChooser } from "@/presentation/utils/place-links";
import { useAuthStore } from "@/infrastructure/storage/auth-store";
import { formatDateTime } from "@/shared/date-format";
import { borders, colors, radii, spacing } from "@/shared/theme";

type SavedResponse = { responseStatus: "yes" | "no"; delayMinutes: number | null };

export function RespondInvitationScreen() {
  const id = useRouteId();
  const { openDirections } = useLocalSearchParams<{ openDirections?: string | string[] }>();
  const user = useAuthStore((state) => state.user);
  const now = useInvitationClock();
  const invitation = useInvitationDetails(id);
  const respond = useRespondToInvitation(id ?? "");
  const myResponse = invitation.data?.recipients.find((recipient) => recipient.user.id === user?.id);
  const [savedResponse, setSavedResponse] = useState<SavedResponse | null>(null);
  const [didSaveResponse, setDidSaveResponse] = useState(false);
  const currentResponse = savedResponse ?? myResponse;
  const hasAnswered = currentResponse !== undefined && currentResponse.responseStatus !== "pending";
  const [isEditingDecision, setIsEditingDecision] = useState(false);
  const [delayOpen, setDelayOpen] = useState(false);
  const [delayText, setDelayText] = useState("0");
  const [responseError, setResponseError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const requestInFlight = useRef(false);
  const routeId = useRef(id);
  routeId.current = id;
  const directionsOpenedFor = useRef<string | undefined>(undefined);
  const cancelled = invitation.data?.canceledAt !== null && invitation.data?.canceledAt !== undefined;
  const expired = invitation.data !== undefined && new Date(invitation.data.scheduledAt).getTime() <= now.getTime();
  const canRespond = myResponse !== undefined && !cancelled && !expired;

  useEffect(() => {
    setSavedResponse(null); setDidSaveResponse(false); setIsEditingDecision(false); setDelayOpen(false); setResponseError(null); setDelayText("0");
  }, [id]);
  useEffect(() => {
    if (savedResponse !== null && myResponse?.responseStatus === savedResponse.responseStatus && (myResponse.delayMinutes ?? 0) === (savedResponse.delayMinutes ?? 0)) setSavedResponse(null);
  }, [myResponse, savedResponse]);
  useEffect(() => { setDelayText(String(currentResponse?.delayMinutes ?? 0)); }, [currentResponse?.delayMinutes]);
  useEffect(() => {
    if (invitation.data === undefined || myResponse === undefined) return;
    void syncInvitationLiveActivity(invitation.data, { responseStatus: myResponse.responseStatus, delayMinutes: myResponse.delayMinutes })
      .catch((error: unknown) => console.warn("Failed to sync invitation live activity", error));
  }, [invitation.data, myResponse?.delayMinutes, myResponse?.responseStatus]);
  useEffect(() => {
    const requested = openDirections === "1" || (Array.isArray(openDirections) && openDirections.includes("1"));
    if (!requested || id === undefined || directionsOpenedFor.current === id || invitation.data === undefined || cancelled || expired) return;
    directionsOpenedFor.current = id;
    openDirectionsChooser({ name: invitation.data.placeName, address: invitation.data.placeAddress, latitude: invitation.data.latitude, longitude: invitation.data.longitude });
  }, [id, invitation.data, openDirections, cancelled, expired]);

  async function answer(status: "yes" | "no", delayMinutes = 0) {
    if (id === undefined || !canRespond || requestInFlight.current || invitation.data === undefined || new Date(invitation.data.scheduledAt).getTime() <= Date.now()) return;
    const responseId = id;
    const details = invitation.data;
    requestInFlight.current = true;
    setIsSending(true); setResponseError(null); Keyboard.dismiss();
    try {
      await respond.mutateAsync(status === "yes" ? { status, delayMinutes } : { status });
      if (routeId.current === responseId) {
        setSavedResponse({ responseStatus: status, delayMinutes: status === "yes" ? delayMinutes : null });
        setDidSaveResponse(true);
        setIsEditingDecision(false); setDelayOpen(false);
      }
      const activity = status === "yes" ? syncInvitationLiveActivity(details, { responseStatus: status, delayMinutes }) : endInvitationLiveActivity(responseId);
      await activity.catch((error: unknown) => console.warn("Failed to sync invitation live activity", error));
    } catch (error: unknown) {
      if (routeId.current === responseId) setResponseError(getErrorMessage(error));
    } finally {
      requestInFlight.current = false; setIsSending(false);
    }
  }

  function saveDelay() {
    const value = delayText.trim();
    const minutes = Number(value);
    if (!/^\d+$/.test(value) || !Number.isInteger(minutes) || minutes < 0 || minutes > 1440) {
      setResponseError("Entre un nombre entier de minutes entre 0 et 1 440."); return;
    }
    void answer("yes", minutes);
  }

  return <Screen dismissKeyboardOnPress={false}>
    {invitation.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {invitation.isError ? <View style={styles.section}><Text accessibilityRole="alert" style={styles.error}>Impossible de charger la sortie : {getErrorMessage(invitation.error)}</Text><AppButton title="Réessayer" variant="secondary" loading={invitation.isFetching} onPress={() => { void invitation.refetch(); }} /></View> : null}
    {invitation.data !== undefined ? <>
      <PageHeader eyebrow={`De ${invitation.data.creator.pseudo}`} title={invitation.data.placeName} subtitle={formatDateTime(invitation.data.scheduledAt)} tone="blue" compact />
      {cancelled || expired ? <View style={styles.closed} accessibilityLiveRegion="polite"><Text style={styles.sectionTitle}>{cancelled ? "Sortie annulée" : "Sortie passée"}</Text><Text style={styles.copy}>{cancelled ? "L’organisateur a annulé cette sortie." : "L’heure de rendez-vous est passée."} Tu ne peux plus modifier ta réponse.</Text></View> : null}
      {hasAnswered ? <View style={styles.current} accessibilityLiveRegion="polite"><Text style={styles.label}>{cancelled || expired ? "Ta dernière réponse" : didSaveResponse ? "Réponse enregistrée" : "Ta réponse"}</Text><Text style={styles.currentValue}>{formatCurrentResponse(currentResponse?.responseStatus, currentResponse?.delayMinutes)}</Text></View> : null}
      {canRespond && (!hasAnswered || isEditingDecision) ? <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{hasAnswered ? "Modifier ta réponse" : "Tu viens ?"}</Text>
        <AppButton title="Je viens" onPress={() => { void answer("yes", currentResponse?.responseStatus === "yes" ? currentResponse.delayMinutes ?? 0 : 0); }} loading={isSending} variant="success" icon={<Check size={18} color={colors.ink} strokeWidth={3} />} />
        <AppButton title="Je ne peux pas" onPress={() => { void answer("no"); }} disabled={isSending} variant="secondary" icon={<X size={18} color={colors.ink} strokeWidth={3} />} />
        {hasAnswered ? <AppButton title="Garder ma réponse" onPress={() => { setIsEditingDecision(false); setResponseError(null); }} disabled={isSending} variant="secondary" /> : null}
      </View> : null}
      {canRespond && hasAnswered && !isEditingDecision ? <AppButton title="Modifier ma réponse" onPress={() => { setIsEditingDecision(true); setDelayOpen(false); setResponseError(null); }} disabled={isSending} variant="secondary" /> : null}
      {responseError !== null && canRespond ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>Réponse impossible : {responseError}</Text> : null}
      {canRespond && currentResponse?.responseStatus === "yes" && !isEditingDecision ? <View style={styles.section}>
        <AppButton title={delayOpen ? "Fermer le retard" : (currentResponse.delayMinutes ?? 0) > 0 ? "Modifier mon retard" : "Signaler un retard"} variant="secondary" disabled={isSending} onPress={() => { setDelayText(String(currentResponse.delayMinutes ?? 0)); setDelayOpen(!delayOpen); setResponseError(null); }} icon={<Clock3 size={18} color={colors.ink} />} />
        {delayOpen ? <>
          <TextField label="Retard en minutes" accessibilityLabel="Retard en minutes" value={delayText} onChangeText={setDelayText} keyboardType="number-pad" editable={!isSending} />
          <Text style={styles.copy}>0 minute pour retirer le retard. L’organisateur verra ta nouvelle estimation.</Text>
          <AppButton title="Enregistrer mon retard" onPress={saveDelay} loading={isSending} />
        </> : null}
      </View> : null}
      {myResponse === undefined ? <Text style={styles.copy}>Cette invitation ne contient aucune réponse à ton nom.</Text> : null}
      <PlaceVenuePanel invitationId={invitation.data.id} title={invitation.data.placeName} address={invitation.data.placeAddress} latitude={invitation.data.latitude} longitude={invitation.data.longitude} showTransportActions={!cancelled && !expired} />
    </> : null}
  </Screen>;
}

function formatCurrentResponse(status: "pending" | "yes" | "no" | undefined, delayMinutes: number | null | undefined): string {
  if (status === "yes") return (delayMinutes ?? 0) > 0 ? `Je viens · retard de ${delayMinutes} min` : "Je viens";
  if (status === "no") return "Je ne peux pas";
  return "Sans réponse";
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 17, lineHeight: 22, fontWeight: "800" },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  error: { color: colors.red, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  closed: { borderRadius: radii.md, borderWidth: borders.regular, borderColor: colors.border, backgroundColor: colors.redSoft, padding: spacing.md, gap: spacing.xs },
  current: { borderRadius: radii.md, backgroundColor: colors.blueSoft, borderWidth: borders.regular, borderColor: colors.border, padding: spacing.md, gap: spacing.xs },
  label: { color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: "800" },
  currentValue: { color: colors.text, fontSize: 20, lineHeight: 26, fontWeight: "800" }
});
