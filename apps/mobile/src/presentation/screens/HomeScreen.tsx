import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, AppState, Easing, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, Vibration, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { InvitationSafetyGate, invitationHoldDurationMs } from "@/domain/invitation/safety-gate";
import { ProtectedInvitationButton } from "@/presentation/components/ProtectedInvitationButton";
import { ChevronDown, Users, X } from "lucide-react-native";
import type { CreateInvitationRequest } from "@mates/shared";
import type { Place } from "@/domain/place/place";
import { buildInvitationPlaceInput } from "@/domain/invitation/place-input";
import { ApiClientError } from "@/infrastructure/api/api-client";
import { buildTodayScheduledAtFromParts, getDefaultInvitationTimeParts, getInvitationTimeError } from "@/domain/invitation/schedule";
import { InvitationTimePicker } from "@/presentation/components/InvitationTimePicker";
import { useInvitationClock } from "@/presentation/hooks/useInvitationClock";
import { AudiencePicker } from "@/presentation/components/AudiencePicker";
import { AppButton } from "@/presentation/components/AppButton";
import { PlaceResultRow } from "@/presentation/components/PlaceResultRow";
import { PlaceVenuePanel } from "@/presentation/components/PlaceVenuePanel";
import { Screen } from "@/presentation/components/Screen";
import { ActiveInvitationBanner } from "@/presentation/components/ActiveInvitationBanner";
import { TextField } from "@/presentation/components/TextField";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { useFriendGroups, useFriends } from "@/presentation/hooks/useFriends";
import { useActiveCreatedInvitation, useCreateInvitation } from "@/presentation/hooks/useInvitations";
import { usePlaceSearch } from "@/presentation/hooks/usePlaceSearch";
import { syncCreatedInvitationLiveActivity } from "@/infrastructure/live-activities/invitation-live-activity";
import { borders, colors, layout, radii, spacing } from "@/shared/theme";

const holdDurationMs = invitationHoldDurationMs;

export function HomeScreen() {
  const defaultTime = getDefaultInvitationTimeParts();
  const { height, width } = useWindowDimensions();
  const isWide = width >= layout.tabletWidth;
  const isNarrow = width <= layout.compactWidth;
  const isShort = height < 740;
  const [placeQuery, setPlaceQuery] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [hourText, setHourText] = useState(defaultTime.hour);
  const [minuteText, setMinuteText] = useState(defaultTime.minute);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [addressEditing, setAddressEditing] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [isArmed, setIsArmed] = useState(false);
  const [coverRevision, setCoverRevision] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [accessibleConfirmOpen, setAccessibleConfirmOpen] = useState(false);
  const safetyGate = useRef(new InvitationSafetyGate()).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vibrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartedAt = useRef<number | null>(null);
  const activeInvitation = useActiveCreatedInvitation();
  const currentInvitation = activeInvitation.data;
  const friendGroups = useFriendGroups();
  const friends = useFriends();
  const placeSearch = usePlaceSearch(placeQuery);
  const createInvitation = useCreateInvitation();
  const selectedFriends = useMemo(() => (friends.data ?? []).filter((friend) => selectedFriendIds.includes(friend.id)), [friends.data, selectedFriendIds]);
  const recipientKey = selectedFriends.map((friend) => friend.id).sort().join(",");
  const now = useInvitationClock();
  const timeError = getInvitationTimeError(hourText, minuteText, now);
  const placeError = placeQuery.trim().length === 0 ? "Ajoute un lieu pour ta sortie." : placeQuery.trim().length > 160 ? "Le lieu doit contenir au maximum 160 caractères." : null;
  const addressError = customAddress.trim().length > 240 ? "L’adresse doit contenir au maximum 240 caractères." : null;
  const coordinatesMatchAddress = selectedPlace !== null && customAddress.trim() === (selectedPlace.address ?? "").trim();
  const canArm =
    placeError === null && timeError === null && addressError === null && !timePickerOpen &&
    selectedFriends.length > 0 && selectedFriends.length <= 100 && friends.isSuccess && !friends.isFetching && !audienceModalOpen &&
    !createInvitation.isPending && !isSending &&
    activeInvitation.data === null &&
    !activeInvitation.isLoading;
  const canLaunch = canArm && isArmed;
  useEffect(() => { resetSafety(); }, [recipientKey, canArm, placeQuery, customAddress, hourText, minuteText, now.toDateString()]);
  useEffect(() => { setSendError(null); }, [recipientKey, placeQuery, customAddress, hourText, minuteText]);
  useFocusEffect(useCallback(() => () => { resetSafety(); setAccessibleConfirmOpen(false); }, []));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") { resetSafety(); setAccessibleConfirmOpen(false); }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (currentInvitation == null) return;
    syncCreatedInvitationLiveActivity(currentInvitation).catch((error: unknown) => {
      console.warn("Failed to sync created invitation live activity", error);
    });
  }, [currentInvitation]);

  useEffect(() => {
    return () => {
      stopVibrationRamp();
      if (holdTimer.current !== null) {
        clearTimeout(holdTimer.current);
      }
    };
  }, []);

  function resetSafety() {
    setCoverRevision((value) => value + 1);
    if (holdTimer.current !== null) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    holdProgress.stopAnimation();
    stopVibrationRamp();
    safetyGate.reset();
    if (safetyGate.phase !== "sending") setIsArmed(false);
    setIsHolding(false);
    holdProgress.setValue(0);
  }

  function stopVibrationRamp() {
    if (vibrationTimer.current !== null) {
      clearTimeout(vibrationTimer.current);
      vibrationTimer.current = null;
    }

    holdStartedAt.current = null;
    Vibration.cancel();
  }

  function scheduleVibrationPulse() {
    if (holdStartedAt.current === null) {
      return;
    }

    const progress = Math.min(1, (Date.now() - holdStartedAt.current) / holdDurationMs);
    const duration = Math.round(12 + progress * 58);
    const delay = Math.round(150 - progress * 86);
    Vibration.vibrate(duration);
    vibrationTimer.current = setTimeout(scheduleVibrationPulse, delay);
  }

  function startVibrationRamp() {
    stopVibrationRamp();
    holdStartedAt.current = Date.now();
    scheduleVibrationPulse();
  }

  function selectPlace(place: Place) {
    Keyboard.dismiss();
    setSelectedPlace(place);
    setPlaceQuery(place.name);
    setCustomAddress(place.address ?? "");
    setAddressEditing(false);
    setMapOpen(false);
    resetSafety();
  }

  async function launchInvitation() {
    setSendError(null);
    const currentTimeError = getInvitationTimeError(hourText, minuteText);
    if (placeError !== null || addressError !== null || currentTimeError !== null) {
      Alert.alert("Vérifie ta sortie", placeError ?? addressError ?? currentTimeError ?? "Vérifie les informations.");
      safetyGate.settle(); setIsSending(false); resetSafety();
      return;
    }
    if (selectedFriends.length === 0 || selectedFriends.length > 100 || !friends.isSuccess || friends.isFetching || audienceModalOpen) {
      Alert.alert("Invités manquants", "Choisis entre 1 et 100 amis avant d’envoyer.");
      safetyGate.settle(); setIsSending(false); resetSafety();
      return;
    }
    const placeName = selectedPlace?.name ?? placeQuery.trim();
    if (placeName.length === 0) {
      Alert.alert("Lieu manquant", "Ajoute un lieu avant d’armer le bouton.");
      safetyGate.settle(); setIsSending(false); resetSafety();
      return;
    }

    try {
      const scheduledAt = buildTodayScheduledAtFromParts(hourText, minuteText);
      const request: CreateInvitationRequest = {
        ...buildInvitationPlaceInput(selectedPlace, placeQuery, customAddress),
        scheduledAt,
        friendUserIds: selectedFriends.map((friend) => friend.id)
      };

      const invitation = await createInvitation.mutateAsync(request);
      resetSafety();
      router.push({ pathname: "/invitations/created/[id]", params: { id: invitation.id } });
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.code === "INVITATION_ALREADY_ACTIVE") {
        const invitationId = getInvitationIdFromError(error.details);
        resetSafety();
        if (invitationId !== undefined) {
          router.replace({ pathname: "/invitations/created/[id]", params: { id: invitationId } });
          return;
        }
      }

      Alert.alert("Envoi impossible", getErrorMessage(error));
      setSendError(getErrorMessage(error));
      resetSafety();
    } finally {
      safetyGate.settle();
      setIsSending(false);
      resetSafety();
    }
  }

  function startHold() {
    if (!canLaunch || holdTimer.current !== null || !safetyGate.beginHold(Date.now())) {
      return;
    }
    setIsHolding(true);

    Animated.timing(holdProgress, {
      toValue: 1,
      duration: holdDurationMs,
      easing: Easing.linear,
      useNativeDriver: false
    }).start();
    startVibrationRamp();

    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      if (!safetyGate.finishHold(Date.now())) { resetSafety(); return; }
      setIsHolding(false);
      setIsSending(true);
      stopVibrationRamp();
      Vibration.vibrate([0, 35, 35, 95]);
      launchInvitation().catch((error: unknown) => {
        Alert.alert("Envoi impossible", getErrorMessage(error));
        resetSafety();
      });
    }, holdDurationMs);
  }

  function stopHold() {
    safetyGate.cancelHold();
    setIsHolding(false);
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
      stopVibrationRamp();
      Animated.timing(holdProgress, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
      }).start();
    }
  }


  return (
    <Screen contentStyle={[styles.screen, isWide ? styles.screenWide : null, isShort ? styles.screenShort : null]}>
      {currentInvitation != null ? (
        <ActiveInvitationBanner
          invitation={currentInvitation}
          onPress={() => router.push({ pathname: "/invitations/created/[id]", params: { id: currentInvitation.id } })}
        />
      ) : null}
      <View style={[styles.cockpit, isWide ? styles.cockpitWide : null]}>
        <View pointerEvents={isSending ? "none" : "auto"} style={[styles.formPanel, isWide ? styles.formPanelWide : null]}>
          <View pointerEvents="none" style={styles.formGlow} />
          <Text style={styles.sectionLabel}>Ta sortie</Text>
          {selectedPlace === null ? <TextField
            compact
            label="Lieu"
            value={placeQuery}
            onChangeText={(value) => {
              setPlaceQuery(value);
              setSelectedPlace(null);
              setMapOpen(false);
              resetSafety();
            }}
            placeholder="bar, restaurant, adresse..."
            accessibilityLabel="Lieu de la sortie"
            onFocus={resetSafety}
          /> : <View style={styles.placeSummary}>
            <View style={styles.placeHeading}><Text style={[styles.placeName, { flex: 1 }]}>{selectedPlace.name}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Modifier le lieu" style={styles.inlineAction} onPress={() => { setSelectedPlace(null); setAddressEditing(false); setMapOpen(false); resetSafety(); }}><Text style={styles.inlineActionText}>Modifier</Text></Pressable>
            </View>
            {!addressEditing ? <Text style={styles.helper}>{customAddress || "Adresse non renseignée"}</Text> : null}
          </View>}
          {placeError !== null ? <Text style={styles.helper}>{placeError}</Text> : null}
          {activeInvitation.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {activeInvitation.isError ? <><Text accessibilityRole="alert" style={styles.error}>Impossible de vérifier si une sortie est déjà en cours.</Text><AppButton title="Réessayer pour les sorties" variant="secondary" onPress={() => { void activeInvitation.refetch(); }} /></> : null}
          {placeSearch.isLoading && selectedPlace === null ? <ActivityIndicator accessibilityLabel="Recherche de lieux" color={colors.primary} /> : null}
          {placeSearch.isError && selectedPlace === null ? <Text style={styles.helper}>La recherche de lieux est indisponible. Tu peux saisir le nom et l’adresse toi-même.</Text> : null}
          {placeSearch.data !== undefined && placeSearch.data.length > 0 && selectedPlace === null ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={[styles.results, isWide ? styles.resultsWide : null]}
              contentContainerStyle={styles.resultsContent}
            >
              {placeSearch.data.slice(0, 6).map((place) => (
                <PlaceResultRow key={place.id} title={place.name} subtitle={place.address ?? "Lieu"} onPress={() => selectPlace(place)} />
              ))}
            </ScrollView>
          ) : null}
          {addressEditing ? <TextField compact label="Adresse (optionnelle)" accessibilityLabel="Adresse de la sortie" value={customAddress}
            onFocus={resetSafety} onChangeText={(value) => { setCustomAddress(value); setMapOpen(false); resetSafety(); }} placeholder="Numéro, rue, ville" /> : null}
          {selectedPlace === null && !addressEditing && customAddress ? <Text style={styles.helper}>{customAddress}</Text> : null}
          <View style={styles.fieldRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={addressEditing ? "Terminer la modification de l’adresse" : customAddress ? "Modifier l’adresse" : "Ajouter une adresse"} style={[styles.inlineAction, { flex: 1 }]} onPress={() => { Keyboard.dismiss(); setAddressEditing(!addressEditing); resetSafety(); }}><Text style={styles.inlineActionText}>{addressEditing ? "Terminer" : customAddress ? "Modifier l’adresse" : "Ajouter une adresse"}</Text></Pressable>
            {coordinatesMatchAddress && selectedPlace?.latitude != null && selectedPlace?.longitude != null ? <Pressable accessibilityRole="button" accessibilityLabel={mapOpen ? "Masquer la carte" : "Voir la carte"} style={[styles.inlineAction, { flex: 1 }]} onPress={() => { Keyboard.dismiss(); setMapOpen(!mapOpen); }}><Text style={styles.inlineActionText}>{mapOpen ? "Masquer la carte" : "Voir la carte"}</Text></Pressable> : null}
          </View>
          {addressError !== null ? <Text accessibilityRole="alert" style={styles.error}>{addressError}</Text> : null}
          {selectedPlace !== null && !coordinatesMatchAddress ? <Text style={styles.helper}>Adresse modifiée : l’ancienne position sur la carte ne sera pas envoyée.</Text> : null}
          {mapOpen && coordinatesMatchAddress && selectedPlace !== null ? (
            <PlaceVenuePanel
              title={selectedPlace.name}
              latitude={selectedPlace.latitude}
              longitude={selectedPlace.longitude}
              showTransportActions={false}
              compact
            />
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel={`Choisir l’heure, aujourd’hui à ${hourText}:${minuteText}`} onPress={() => { Keyboard.dismiss(); resetSafety(); setTimePickerOpen(true); }} style={styles.audienceButton}>
            <Text style={styles.audienceButtonValue}>Aujourd’hui · {hourText}:{minuteText}</Text><ChevronDown color={colors.ink} size={18} />
          </Pressable>
          {timeError !== null ? <Text accessibilityRole="alert" style={styles.error}>{timeError}</Text> : null}
          <View style={styles.audienceBlock}>
            <Text style={styles.limitSectionLabel}>Invités</Text>
            <Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); resetSafety(); setAudienceModalOpen(true); }} style={styles.audienceButton}>
              <View style={styles.audienceButtonIcon}>
                <Users size={16} color={colors.ink} strokeWidth={3} />
              </View>
              <View style={styles.audienceButtonTextBlock}>
                <Text style={styles.audienceButtonLabel}>Choisir les destinataires</Text>
                <Text style={styles.audienceButtonValue}>
                  {selectedFriends.length === 0 ? "Choisir mes invités" : `${selectedFriends.length} personne(s) invitée(s)`}
                </Text>
              </View>
              <ChevronDown size={18} color={colors.ink} strokeWidth={3} />
            </Pressable>
            <View style={styles.chipRow}>{selectedFriends.map((friend) => <HomeSelectionChip key={friend.id} label={friend.pseudo} onClear={() => { setSelectedFriendIds((ids) => ids.filter((id) => id !== friend.id)); resetSafety(); }} />)}</View>
            {selectedFriendIds.length > selectedFriends.length ? <Text style={styles.audienceButtonLabel}>Certains amis ne sont plus disponibles et ne seront pas invités.</Text> : null}
            {selectedFriends.length === 0 ? <Text style={styles.audienceButtonLabel}>Choisis au moins un ami pour pouvoir envoyer.</Text> : null}
            {friends.isFetching ? <Text style={styles.audienceButtonLabel}>Vérification des invités…</Text> : null}
            {friends.isError ? <><Text accessibilityRole="alert" style={styles.audienceButtonLabel}>Impossible de vérifier tes invités. Réessaie avant d’envoyer.</Text><AppButton title="Réessayer pour les invités" variant="secondary" onPress={() => { void friends.refetch(); }} /></> : null}
          </View>
        </View>

        <ProtectedInvitationButton
          revision={coverRevision}
          armed={isArmed}
          ready={canArm}
          holding={isHolding}
          sending={isSending}
          error={sendError}
          holdProgress={holdProgress}
          compact={isNarrow || isShort}
          onOpen={() => { if (canArm && safetyGate.open()) { Keyboard.dismiss(); setSendError(null); setIsArmed(true); Vibration.vibrate(42); } }}
          onClose={resetSafety}
          onHold={startHold}
          onRelease={stopHold}
          onAccessibleSend={() => { if (canLaunch) setAccessibleConfirmOpen(true); }}
        />
      </View>

      {sendError ? <View><Text accessibilityRole="alert" style={styles.error}>Envoi impossible : {sendError}</Text><Text style={styles.helper}>Le capot est refermé. Vérifie ta sortie puis ouvre-le pour réessayer.</Text></View> : null}
      <Modal transparent visible={accessibleConfirmOpen} animationType="fade" onRequestClose={() => setAccessibleConfirmOpen(false)}>
        <View style={styles.modalScrim}><View accessibilityViewIsModal style={styles.modalCard}>
          <Text accessibilityRole="header" style={styles.placeName}>Confirmer l’invitation</Text>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: spacing.sm }}>
            <Text style={styles.helper}>{placeQuery} · Aujourd’hui à {hourText}:{minuteText}</Text>
            {customAddress ? <Text style={styles.helper}>{customAddress}</Text> : null}
            <Text style={styles.helper}>{selectedFriends.length} invité(s) : {selectedFriends.map((friend) => friend.pseudo).join(", ")}</Text>
          </ScrollView>
          <AppButton title="Confirmer et inviter mes amis" disabled={!canLaunch} onPress={() => {
            if (canLaunch && safetyGate.confirmAccessible()) { setAccessibleConfirmOpen(false); setIsSending(true); void launchInvitation(); }
          }} />
          <AppButton title="Annuler" variant="secondary" onPress={() => { setAccessibleConfirmOpen(false); resetSafety(); }} />
        </View></View>
      </Modal>
      {timePickerOpen ? <InvitationTimePicker hour={hourText} minute={minuteText} onClose={() => setTimePickerOpen(false)} onConfirm={(hour, minute) => { setHourText(hour); setMinuteText(minute); setTimePickerOpen(false); resetSafety(); }} /> : null}
      {audienceModalOpen ? <AudiencePicker
        groups={friendGroups.data ?? []}
        friends={friends.data ?? []}
        initialIds={selectedFriends.map((friend) => friend.id)}
        loading={friends.isLoading || friends.isFetching}
        failed={friends.isError} groupsFailed={friendGroups.isError} groupsLoading={friendGroups.isLoading}
        onRetry={() => { void friends.refetch(); void friendGroups.refetch(); }}
        onClose={() => setAudienceModalOpen(false)}
        onConfirm={(ids) => {
          setSelectedFriendIds(ids);
          setAudienceModalOpen(false);
          resetSafety();
        }}
      /> : null}
    </Screen>
  );
}

function getInvitationIdFromError(details: unknown): string | undefined {
  if (typeof details !== "object" || details === null) {
    return undefined;
  }

  const invitationId = (details as { invitationId?: unknown }).invitationId;
  return typeof invitationId === "string" && invitationId.length > 0 ? invitationId : undefined;
}

function HomeSelectionChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${label}`} onPress={onClear} style={styles.chipTarget}>
      <View style={styles.chip}>
        <Text style={styles.chipText}>{label}</Text>
        <X size={14} color={colors.ink} strokeWidth={3} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  placeHeading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  inlineAction: { minHeight: 44, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, alignItems: "center", justifyContent: "center", borderWidth: borders.regular, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surfaceStrong },
  inlineActionText: { color: colors.ink, fontSize: 12, fontWeight: "800", textAlign: "center" },
  placeSummary: { gap: spacing.xs },
  placeName: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  helper: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  error: { color: colors.redPressed, fontSize: 13, lineHeight: 18 },
  screen: {
    flex: 1,
    position: "relative",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
    gap: spacing.sm
  },
  screenShort: {
    paddingBottom: spacing.xs,
    gap: spacing.xs
  },
  screenWide: {
    maxWidth: 860
  },
  cockpit: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.sm
  },
  cockpitWide: {
    alignSelf: "stretch"
  },
  formPanel: {
    position: "relative",
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    gap: spacing.sm,
    zIndex: 4
  },
  formPanelWide: {
    padding: spacing.md
  },
  formGlow: {
    position: "absolute",
    top: -38,
    right: -28,
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: colors.blueSoft
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  results: {
    maxHeight: 160,
    zIndex: 10
  },
  resultsContent: {
    gap: spacing.xxs
  },
  resultsWide: {
    maxHeight: 200
  },
  fieldRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  timeField: {
    flex: 1
  },
  fieldFlex: {
    flex: 1
  },
  audienceBlock: {
    gap: spacing.xs
  },
  limitSectionLabel: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  audienceButton: {
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  audienceButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center"
  },
  audienceButtonTextBlock: {
    flex: 1,
    gap: 2
  },
  audienceButtonLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  audienceButtonValue: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900"
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  chip: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceStrong,
    minHeight: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start"
  },
  chipText: {
    flexShrink: 1,
    color: colors.ink,
    fontWeight: "700",
    fontSize: 12
  },
  chipTarget: { minHeight: 44, minWidth: 44, maxWidth: "100%", justifyContent: "center", alignItems: "flex-start" },
  modalScrim: {
    flex: 1,
    backgroundColor: "rgba(7, 26, 45, 0.22)",
    justifyContent: "center",
    padding: spacing.md
  },
  modalCard: {
    maxHeight: "80%",
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.sm
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  modalScroll: {
    gap: spacing.sm
  },
  modalSection: {
    gap: spacing.xs
  },
  modalSectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  groupCard: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong
  },
  groupCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  groupCardTitleBlock: {
    flex: 1,
    gap: spacing.xxs
  },
  groupCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  groupCardSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  groupCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  miniButton: {
    borderWidth: borders.regular,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  miniButtonActive: {
    backgroundColor: colors.yellow
  },
  miniButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  memberList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  memberPill: {
    borderWidth: borders.regular,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.blueSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  memberPillText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
});
