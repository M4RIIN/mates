import { useEffect, useMemo, useRef, useState } from "react";
import type { GestureResponderHandlers, LayoutChangeEvent } from "react-native";
import { ActivityIndicator, Alert, Animated, Easing, Keyboard, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, Vibration, View } from "react-native";
import { router } from "expo-router";
import { Bell, ChevronDown, Users, X } from "lucide-react-native";
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

const guardTravel = 138;
const guardTrackPadding = 5;
const holdDurationMs = 1150;

export function HomeScreen() {
  const defaultTime = getDefaultInvitationTimeParts();
  const { height, width } = useWindowDimensions();
  const isWide = width >= layout.tabletWidth;
  const isNarrow = width <= layout.compactWidth;
  const isShort = height < 740;
  const [guardTrackWidth, setGuardTrackWidth] = useState(0);
  const [guardPlateWidth, setGuardPlateWidth] = useState(0);
  const measuredGuardTravel = Math.max(0, guardTrackWidth - guardPlateWidth - guardTrackPadding * 2);
  const fallbackGuardTravel = Math.max(84, Math.min(guardTravel, width - 230));
  const effectiveGuardTravel = measuredGuardTravel > 0 ? measuredGuardTravel : fallbackGuardTravel;
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
  const guardX = useRef(new Animated.Value(0)).current;
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
    !createInvitation.isPending &&
    activeInvitation.data === null &&
    !activeInvitation.isLoading;
  const canLaunch = canArm && isArmed;
  useEffect(() => { resetSafety(); }, [recipientKey, canArm]);

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
    if (holdTimer.current !== null) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    holdProgress.stopAnimation();
    stopVibrationRamp();
    setIsArmed(false);
    Animated.spring(guardX, {
      toValue: 0,
      tension: 150,
      friction: 18,
      useNativeDriver: true
    }).start();
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
    const currentTimeError = getInvitationTimeError(hourText, minuteText);
    if (placeError !== null || addressError !== null || currentTimeError !== null) {
      Alert.alert("Vérifie ta sortie", placeError ?? addressError ?? currentTimeError ?? "Vérifie les informations.");
      resetSafety();
      return;
    }
    if (selectedFriends.length === 0 || selectedFriends.length > 100 || !friends.isSuccess || friends.isFetching || audienceModalOpen) {
      Alert.alert("Invités manquants", "Choisis entre 1 et 100 amis avant d’envoyer.");
      resetSafety();
      return;
    }
    const placeName = selectedPlace?.name ?? placeQuery.trim();
    if (placeName.length === 0) {
      Alert.alert("Lieu manquant", "Ajoute un lieu avant d’armer le bouton.");
      resetSafety();
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
      resetSafety();
    }
  }

  function startHold() {
    if (!canLaunch || holdTimer.current !== null) {
      return;
    }

    Animated.timing(holdProgress, {
      toValue: 1,
      duration: holdDurationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
    startVibrationRamp();

    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      stopVibrationRamp();
      Vibration.vibrate([0, 35, 35, 95]);
      launchInvitation().catch((error: unknown) => {
        Alert.alert("Envoi impossible", getErrorMessage(error));
        resetSafety();
      });
    }, holdDurationMs);
  }

  function stopHold() {
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

  const guardResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => canArm && !isArmed,
    onMoveShouldSetPanResponder: (_, gesture) => canArm && !isArmed && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => {
      Keyboard.dismiss();
      guardX.stopAnimation();
    },
    onPanResponderMove: (_, gesture) => {
      if (!canArm || isArmed) {
        return;
      }

      guardX.setValue(Math.min(Math.max(gesture.dx, 0), effectiveGuardTravel));
    },
    onPanResponderRelease: (_, gesture) => {
      if (!canArm || isArmed) {
        return;
      }

      const currentX = Math.min(Math.max(gesture.dx, 0), effectiveGuardTravel);
      const progress = effectiveGuardTravel > 0 ? currentX / effectiveGuardTravel : 0;
      const nearEndThreshold = Math.max(effectiveGuardTravel - 28, effectiveGuardTravel * 0.72);
      const shouldArm = currentX >= nearEndThreshold || progress >= 0.72 || (progress >= 0.35 && gesture.vx > 0.55);
      setIsArmed(shouldArm);
      Vibration.vibrate(shouldArm ? 42 : 12);
      Animated.spring(guardX, {
        toValue: shouldArm ? effectiveGuardTravel : 0,
        tension: 150,
        friction: 18,
        useNativeDriver: true
      }).start();
    },
    onPanResponderTerminate: () => {
      if (!isArmed) {
        Animated.spring(guardX, {
          toValue: 0,
          tension: 150,
          friction: 18,
          useNativeDriver: true
        }).start();
      }
    }
  });

  return (
    <Screen contentStyle={[styles.screen, isWide ? styles.screenWide : null, isShort ? styles.screenShort : null]}>
      {currentInvitation != null ? (
        <ActiveInvitationBanner
          invitation={currentInvitation}
          onPress={() => router.push({ pathname: "/invitations/created/[id]", params: { id: currentInvitation.id } })}
        />
      ) : null}
      <View style={[styles.cockpit, isWide ? styles.cockpitWide : null]}>
        <View style={[styles.formPanel, isWide ? styles.formPanelWide : null]}>
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

        <LaunchConsole
          armed={isArmed}
          canArm={canArm}
          canLaunch={canLaunch}
          guardX={guardX}
          holdProgress={holdProgress}
          loading={createInvitation.isPending}
          compact={isNarrow || isShort}
          panHandlers={guardResponder.panHandlers}
          onGuardTrackLayout={(event) => setGuardTrackWidth(event.nativeEvent.layout.width)}
          onGuardPlateLayout={(event) => setGuardPlateWidth(event.nativeEvent.layout.width)}
          onPressIn={startHold}
          onPressOut={stopHold}
        />
      </View>

      <View style={styles.statusLine}>
        <Bell size={17} color={colors.ink} strokeWidth={3} />
        <Text style={styles.statusText}>
          {activeInvitation.data !== null && activeInvitation.data !== undefined
            ? "Un rendez-vous est déjà en cours"
            : isArmed
              ? "Protection retirée"
              : "Swipe la protection, puis maintien"}
        </Text>
      </View>
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

function LaunchConsole({
  armed,
  canArm,
  canLaunch,
  guardX,
  holdProgress,
  loading,
  compact,
  panHandlers,
  onGuardTrackLayout,
  onGuardPlateLayout,
  onPressIn,
  onPressOut
}: {
  armed: boolean;
  canArm: boolean;
  canLaunch: boolean;
  guardX: Animated.Value;
  holdProgress: Animated.Value;
  loading: boolean;
  compact: boolean;
  panHandlers: GestureResponderHandlers;
  onGuardTrackLayout: (event: LayoutChangeEvent) => void;
  onGuardPlateLayout: (event: LayoutChangeEvent) => void;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  const pulseScale = holdProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const progressWidth = holdProgress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={[styles.launchPanel, compact ? styles.launchPanelCompact : null]}>
      <View style={[styles.guardZone, compact ? styles.guardZoneCompact : null]}>
        <Text style={styles.guardLabel}>{armed ? "Protection ouverte" : canArm ? "Swipe pour retirer la protection" : "Complète la mission"}</Text>
        <View
          onLayout={onGuardTrackLayout}
          style={[styles.guardTrack, compact ? styles.guardTrackCompact : null, !canArm ? styles.guardTrackDisabled : null]}
          {...panHandlers}
        >
          <Animated.View
            onLayout={onGuardPlateLayout}
            style={[styles.guardPlate, compact ? styles.guardPlateCompact : null, armed ? styles.guardPlateArmed : null, { transform: [{ translateX: guardX }] }]}
          >
            <View style={[styles.guardGrip, armed ? styles.guardGripArmed : null]} />
            <Text style={[styles.guardText, armed ? styles.guardTextArmed : null]}>{armed ? "ARMÉ" : "LOCK"}</Text>
          </Animated.View>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!canLaunch || loading}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.launchButtonShell,
          compact ? styles.launchButtonShellCompact : null,
          pressed && canLaunch ? styles.launchButtonPressed : null,
          !canLaunch ? styles.launchDisabled : null
        ]}
      >
        <Animated.View style={[styles.outerRing, compact ? styles.outerRingCompact : null, { transform: [{ scale: pulseScale }] }]}>
          <View style={[styles.warningRing, compact ? styles.warningRingCompact : null]}>
            <View style={styles.warningStripeA} />
            <View style={styles.warningStripeB} />
            <View style={[styles.launchButton, compact ? styles.launchButtonCompact : null]}>
              <View style={[styles.launchCore, compact ? styles.launchCoreCompact : null]}>
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.launchText}>{armed ? "MAINTENIR" : "VERROUILLÉ"}</Text>}
                <Text style={styles.launchSubtext}>{armed ? "Pour envoyer" : "Swipe d’abord"}</Text>
              </View>
            </View>
          </View>
        </Animated.View>
        <View style={[styles.holdMeter, compact ? styles.holdMeterCompact : null]}>
          <Animated.View style={[styles.holdMeterFill, { width: progressWidth }]} />
        </View>
      </Pressable>
    </View>
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
  launchPanel: {
    alignItems: "center",
    gap: spacing.sm
  },
  launchPanelCompact: {
    gap: spacing.xs
  },
  guardZone: {
    width: "100%",
    maxWidth: 360,
    gap: spacing.xxs
  },
  guardZoneCompact: {
    maxWidth: 328
  },
  guardLabel: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase"
  },
  guardTrack: {
    height: 54,
    borderRadius: radii.pill,
    borderWidth: borders.heavy,
    borderColor: colors.border,
    backgroundColor: colors.ink,
    padding: 5,
    overflow: "hidden"
  },
  guardTrackCompact: {
    height: 48
  },
  guardTrackDisabled: {
    opacity: 0.46
  },
  guardPlate: {
    width: 188,
    height: 38,
    borderRadius: 21,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.yellow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  guardPlateCompact: {
    width: 166,
    height: 34
  },
  guardPlateArmed: {
    backgroundColor: colors.primary
  },
  guardGrip: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.ink
  },
  guardGripArmed: {
    backgroundColor: colors.white
  },
  guardText: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  guardTextArmed: {
    color: colors.white
  },
  launchButtonShell: {
    width: 250,
    height: 250,
    alignItems: "center",
    justifyContent: "center"
  },
  launchButtonShellCompact: {
    width: 214,
    height: 214
  },
  launchButtonPressed: {
    transform: [{ scale: 0.985 }]
  },
  launchDisabled: {
    opacity: 0.58
  },
  outerRing: {
    width: 232,
    height: 232,
    borderRadius: 116,
    borderWidth: borders.heavy,
    borderColor: colors.border,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center"
  },
  outerRingCompact: {
    width: 198,
    height: 198,
    borderRadius: 99
  },
  warningRing: {
    width: 206,
    height: 206,
    borderRadius: 103,
    borderWidth: borders.heavy,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  warningRingCompact: {
    width: 176,
    height: 176,
    borderRadius: 88
  },
  warningStripeA: {
    position: "absolute",
    width: 260,
    height: 28,
    backgroundColor: colors.primary,
    transform: [{ rotate: "-35deg" }]
  },
  warningStripeB: {
    position: "absolute",
    width: 260,
    height: 28,
    backgroundColor: colors.yellow,
    transform: [{ rotate: "35deg" }]
  },
  launchButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: borders.heavy,
    borderColor: colors.border,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 0,
    elevation: 5
  },
  launchButtonCompact: {
    width: 130,
    height: 130,
    borderRadius: 65
  },
  launchCore: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.redPressed,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm
  },
  launchCoreCompact: {
    width: 100,
    height: 100,
    borderRadius: 50
  },
  launchText: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
    textAlign: "center"
  },
  launchSubtext: {
    color: colors.white,
    marginTop: spacing.xxs,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    opacity: 0.86,
    textAlign: "center",
    textTransform: "uppercase"
  },
  holdMeter: {
    position: "absolute",
    bottom: 12,
    width: 154,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  holdMeterCompact: {
    bottom: 8,
    width: 132
  },
  holdMeterFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.primary
  },
  statusLine: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  statusText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase"
  }
});
