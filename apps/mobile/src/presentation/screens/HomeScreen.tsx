import { useEffect, useRef, useState } from "react";
import type { GestureResponderHandlers } from "react-native";
import { ActivityIndicator, Alert, Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, Vibration, View } from "react-native";
import { router } from "expo-router";
import { Bell, Inbox, Send, Settings, User, Users, X } from "lucide-react-native";
import type { CreateInvitationRequest } from "@mates/shared";
import type { Place } from "@/domain/place/place";
import { buildTodayScheduledAt, getDefaultInvitationTime } from "@/domain/invitation/schedule";
import { PlaceResultRow } from "@/presentation/components/PlaceResultRow";
import { PlaceVenuePanel } from "@/presentation/components/PlaceVenuePanel";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { useAuthStore } from "@/infrastructure/storage/auth-store";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { useCurrentUser } from "@/presentation/hooks/useAuth";
import { useCreateInvitation } from "@/presentation/hooks/useInvitations";
import { usePlaceSearch } from "@/presentation/hooks/usePlaceSearch";
import { useRegisterPushNotifications } from "@/presentation/hooks/usePushNotifications";
import { borders, colors, layout, radii, spacing } from "@/shared/theme";

const guardTravel = 138;
const holdDurationMs = 1150;

export function HomeScreen() {
  const { height, width } = useWindowDimensions();
  const isWide = width >= layout.tabletWidth;
  const isNarrow = width <= layout.compactWidth;
  const isShort = height < 740;
  const effectiveGuardTravel = Math.max(84, Math.min(guardTravel, width - 230));
  const user = useAuthStore((state) => state.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [timeText, setTimeText] = useState(getDefaultInvitationTime());
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isArmed, setIsArmed] = useState(false);
  const guardX = useRef(new Animated.Value(0)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vibrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartedAt = useRef<number | null>(null);
  const placeSearch = usePlaceSearch(placeQuery);
  const createInvitation = useCreateInvitation();
  const canArm = placeQuery.trim().length > 0 && timeText.trim().length > 0 && !createInvitation.isPending;
  const canLaunch = canArm && isArmed;

  useCurrentUser();
  useRegisterPushNotifications();

  useEffect(() => {
    return () => {
      stopVibrationRamp();
      if (holdTimer.current !== null) {
        clearTimeout(holdTimer.current);
      }
    };
  }, []);

  function resetSafety() {
    stopVibrationRamp();
    setIsArmed(false);
    Animated.spring(guardX, {
      toValue: 0,
      speed: 18,
      bounciness: 5,
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
    setSelectedPlace(place);
    setPlaceQuery(place.name);
    setCustomAddress(place.address ?? "");
    resetSafety();
  }

  async function launchInvitation() {
    const placeName = selectedPlace?.name ?? placeQuery.trim();
    if (placeName.length === 0) {
      Alert.alert("Lieu manquant", "Ajoute un lieu avant d’armer le bouton.");
      resetSafety();
      return;
    }

    try {
      const scheduledAt = buildTodayScheduledAt(timeText);
      const address = selectedPlace?.address ?? customAddress.trim();
      const request: CreateInvitationRequest = {
        placeName,
        scheduledAt,
        ...(address.length > 0 ? { placeAddress: address } : {}),
        ...(selectedPlace?.latitude !== null && selectedPlace?.latitude !== undefined ? { latitude: selectedPlace.latitude } : {}),
        ...(selectedPlace?.longitude !== null && selectedPlace?.longitude !== undefined ? { longitude: selectedPlace.longitude } : {})
      };

      const invitation = await createInvitation.mutateAsync(request);
      resetSafety();
      router.push({ pathname: "/invitations/created/[id]", params: { id: invitation.id } });
    } catch (error: unknown) {
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

      const shouldArm = gesture.dx > effectiveGuardTravel * 0.5 || gesture.vx > 0.85;
      setIsArmed(shouldArm);
      Vibration.vibrate(shouldArm ? 42 : 12);
      Animated.spring(guardX, {
        toValue: shouldArm ? effectiveGuardTravel : 0,
        speed: 18,
        bounciness: 4,
        useNativeDriver: true
      }).start();
    },
    onPanResponderTerminate: () => {
      if (!isArmed) {
        Animated.spring(guardX, {
          toValue: 0,
          speed: 18,
          bounciness: 4,
          useNativeDriver: true
        }).start();
      }
    }
  });

  return (
    <Screen contentStyle={[styles.screen, isWide ? styles.screenWide : null, isShort ? styles.screenShort : null]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => setMenuOpen((value) => !value)} style={styles.gearButton}>
          {menuOpen ? <X size={22} color={colors.ink} strokeWidth={3} /> : <Settings size={22} color={colors.ink} strokeWidth={3} />}
        </Pressable>
        <View style={styles.identity}>
          <Text style={styles.identityLabel}>Mates</Text>
          <Text numberOfLines={1} style={styles.identityValue}>
            {user?.pseudo !== undefined && user.publicTag !== undefined ? `${user.pseudo} · ${user.publicTag}` : user?.pseudo ?? "Accueil"}
          </Text>
        </View>
      </View>

      {menuOpen ? <FluxMenu onClose={() => setMenuOpen(false)} /> : null}

      <View style={[styles.cockpit, isWide ? styles.cockpitWide : null]}>
        <View style={[styles.formPanel, isWide ? styles.formPanelWide : null]}>
          <View pointerEvents="none" style={styles.formGlow} />
          <Text style={styles.sectionLabel}>Rencard</Text>
          <TextField
            compact
            label="Lieu"
            value={placeQuery}
            onChangeText={(value) => {
              setPlaceQuery(value);
              setSelectedPlace(null);
              resetSafety();
            }}
            placeholder="bar, restaurant, adresse..."
          />
          {placeSearch.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
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
          {selectedPlace !== null ? (
            <PlaceVenuePanel
              title={selectedPlace.name}
              address={selectedPlace.address}
              latitude={selectedPlace.latitude}
              longitude={selectedPlace.longitude}
              compact
            />
          ) : null}
          <View style={styles.fieldRow}>
            <View style={styles.fieldFlex}>
              <TextField compact label="Heure" value={timeText} onChangeText={(value) => {
                setTimeText(value);
                resetSafety();
              }} placeholder="20:30" />
            </View>
            <View style={styles.fieldFlex}>
              <TextField compact label="Adresse" value={customAddress} onChangeText={(value) => {
                setCustomAddress(value);
                resetSafety();
              }} placeholder={isNarrow ? "Opt." : "Optionnel"} />
            </View>
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
          onPressIn={startHold}
          onPressOut={stopHold}
        />
      </View>

      <View style={styles.statusLine}>
        <Bell size={17} color={colors.ink} strokeWidth={3} />
        <Text style={styles.statusText}>{isArmed ? "Protection retirée" : "Swipe la protection, puis maintien"}</Text>
      </View>
    </Screen>
  );
}

function FluxMenu({ onClose }: { onClose: () => void }) {
  const items = [
    { label: "Reçues", icon: Inbox, href: "/invitations/received" },
    { label: "Créées", icon: Send, href: "/invitations/created" },
    { label: "Amis", icon: Users, href: "/friends" },
    { label: "Profil", icon: User, href: "/profile" }
  ] as const;

  return (
    <View style={styles.menuPanel}>
      <View style={styles.menuHeader}>
        <Text style={styles.menuTitle}>Flux</Text>
        <View style={styles.menuRule} />
      </View>
      <View style={styles.menuItems}>
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Pressable
              key={item.href}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                router.push(item.href);
              }}
              style={styles.menuItem}
            >
              <Icon size={18} color={colors.ink} strokeWidth={3} />
              <Text style={styles.menuItemText}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  const pulseScale = holdProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const progressWidth = holdProgress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={[styles.launchPanel, compact ? styles.launchPanelCompact : null]}>
      <View style={[styles.guardZone, compact ? styles.guardZoneCompact : null]}>
        <Text style={styles.guardLabel}>{armed ? "Protection ouverte" : canArm ? "Swipe pour retirer la protection" : "Complète la mission"}</Text>
        <View style={[styles.guardTrack, compact ? styles.guardTrackCompact : null, !canArm ? styles.guardTrackDisabled : null]} {...panHandlers}>
          <Animated.View style={[styles.guardPlate, compact ? styles.guardPlateCompact : null, armed ? styles.guardPlateArmed : null, { transform: [{ translateX: guardX }] }]}>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  gearButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 0,
    elevation: 2
  },
  identity: {
    flex: 1,
    alignItems: "flex-end"
  },
  identityLabel: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  identityValue: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900"
  },
  menuPanel: {
    position: "absolute",
    top: 56,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 20,
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 8
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  menuTitle: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  menuRule: {
    flex: 1,
    height: borders.regular,
    backgroundColor: colors.border
  },
  menuItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  menuItem: {
    minHeight: 46,
    flexGrow: 1,
    flexBasis: "44%",
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.navyWash,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  menuItemText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    textTransform: "uppercase"
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
    position: "absolute",
    top: 108,
    left: spacing.sm,
    right: spacing.sm,
    maxHeight: 340,
    zIndex: 10
  },
  resultsContent: {
    gap: spacing.xxs
  },
  resultsWide: {
    left: spacing.md,
    right: spacing.md
  },
  fieldRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  fieldFlex: {
    flex: 1
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
