import { useEffect, useMemo, useRef, useState } from "react";
import type { GestureResponderHandlers, LayoutChangeEvent } from "react-native";
import { ActivityIndicator, Alert, Animated, Easing, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, Vibration, View } from "react-native";
import { router } from "expo-router";
import { Bell, ChevronDown, Inbox, Send, Settings, User, Users, X } from "lucide-react-native";
import type { CreateInvitationRequest } from "@mates/shared";
import type { Place } from "@/domain/place/place";
import { ApiClientError } from "@/infrastructure/api/api-client";
import { buildTodayScheduledAtFromParts, getDefaultInvitationTimeParts } from "@/domain/invitation/schedule";
import { ListRow } from "@/presentation/components/ListRow";
import { PlaceResultRow } from "@/presentation/components/PlaceResultRow";
import { PlaceVenuePanel } from "@/presentation/components/PlaceVenuePanel";
import { Screen } from "@/presentation/components/Screen";
import { TextField } from "@/presentation/components/TextField";
import { getErrorMessage } from "@/presentation/hooks/useErrorMessage";
import { useCurrentUser } from "@/presentation/hooks/useAuth";
import { useFriendGroups, useFriends, useReceivedFriendRequests } from "@/presentation/hooks/useFriends";
import { countUpcomingInvitations, useActiveCreatedInvitation, useCreateInvitation } from "@/presentation/hooks/useInvitations";
import { useReceivedInvitations } from "@/presentation/hooks/useInvitations";
import { usePlaceSearch } from "@/presentation/hooks/usePlaceSearch";
import { useRegisterPushNotifications } from "@/presentation/hooks/usePushNotifications";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [hourText, setHourText] = useState(defaultTime.hour);
  const [minuteText, setMinuteText] = useState(defaultTime.minute);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<HomeAudienceSelection | null>(null);
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [isArmed, setIsArmed] = useState(false);
  const guardX = useRef(new Animated.Value(0)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vibrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartedAt = useRef<number | null>(null);
  const activeInvitation = useActiveCreatedInvitation();
  const receivedInvitations = useReceivedInvitations();
  const receivedFriendRequests = useReceivedFriendRequests();
  const friendGroups = useFriendGroups();
  const friends = useFriends();
  const placeSearch = usePlaceSearch(placeQuery);
  const createInvitation = useCreateInvitation();
  const receivedInvitationCount = countUpcomingInvitations(receivedInvitations.data);
  const notificationCount = receivedInvitationCount + (receivedFriendRequests.data?.length ?? 0);
  const canArm =
    placeQuery.trim().length > 0 &&
    hourText.trim().length > 0 &&
    minuteText.trim().length > 0 &&
    !createInvitation.isPending &&
    activeInvitation.data === null &&
    !activeInvitation.isLoading;
  const canLaunch = canArm && isArmed;
  const selectedGroup = useMemo(
    () => (selectedAudience?.type === "group" ? friendGroups.data?.find((group) => group.id === selectedAudience.groupId) : undefined),
    [friendGroups.data, selectedAudience]
  );
  const selectedFriend = useMemo(
    () => (selectedAudience?.type === "friend" ? friends.data?.find((friend) => friend.id === selectedAudience.friendId) : undefined),
    [friends.data, selectedAudience]
  );

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

  useEffect(() => {
    if (activeInvitation.data !== null && activeInvitation.data !== undefined) {
      router.replace({ pathname: "/invitations/created/[id]", params: { id: activeInvitation.data.id } });
    }
  }, [activeInvitation.data]);

  function resetSafety() {
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
      const scheduledAt = buildTodayScheduledAtFromParts(hourText, minuteText);
      const address = selectedPlace?.address ?? customAddress.trim();
      const request: CreateInvitationRequest = {
        placeName,
        scheduledAt,
        ...(address.length > 0 ? { placeAddress: address } : {}),
        ...(selectedPlace?.latitude !== null && selectedPlace?.latitude !== undefined ? { latitude: selectedPlace.latitude } : {}),
        ...(selectedPlace?.longitude !== null && selectedPlace?.longitude !== undefined ? { longitude: selectedPlace.longitude } : {}),
        ...(selectedAudience?.type === "group" ? { friendGroupId: selectedAudience.groupId } : {}),
        ...(selectedAudience?.type === "friend" ? { friendUserIds: [selectedAudience.friendId] } : {})
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
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => setMenuOpen((value) => !value)} style={styles.gearButton}>
          {menuOpen ? <X size={22} color={colors.ink} strokeWidth={3} /> : <Settings size={22} color={colors.ink} strokeWidth={3} />}
          {notificationCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{formatNotificationCount(notificationCount)}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {menuOpen ? (
        <FluxMenu
          onClose={() => setMenuOpen(false)}
          receivedInvitationCount={receivedInvitationCount}
          receivedFriendRequestCount={receivedFriendRequests.data?.length ?? 0}
        />
      ) : null}

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
          {activeInvitation.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
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
              showTransportActions={false}
              compact
            />
          ) : null}
          <View style={styles.fieldRow}>
            <View style={styles.timeField}>
              <TextField
                compact
                label="Heure"
                value={hourText}
                onChangeText={(value) => {
                  setHourText(sanitizeTimePart(value));
                  resetSafety();
                }}
                keyboardType="number-pad"
                placeholder="20"
                maxLength={2}
              />
            </View>
            <View style={styles.timeField}>
              <TextField
                compact
                label="Minute"
                value={minuteText}
                onChangeText={(value) => {
                  setMinuteText(sanitizeTimePart(value));
                  resetSafety();
                }}
                keyboardType="number-pad"
                placeholder="30"
                maxLength={2}
              />
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldFlex}>
              <TextField
                compact
                label="Adresse"
                value={customAddress}
                onChangeText={(value) => {
                  setCustomAddress(value);
                  resetSafety();
                }}
                placeholder={isNarrow ? "Opt." : "Optionnel"}
              />
            </View>
          </View>
          <View style={styles.audienceBlock}>
            <Text style={styles.limitSectionLabel}>Diffusion</Text>
            <Pressable accessibilityRole="button" onPress={() => setAudienceModalOpen(true)} style={styles.audienceButton}>
              <View style={styles.audienceButtonIcon}>
                <Users size={16} color={colors.ink} strokeWidth={3} />
              </View>
              <View style={styles.audienceButtonTextBlock}>
                <Text style={styles.audienceButtonLabel}>Limiter a</Text>
                <Text style={styles.audienceButtonValue}>
                  {selectedAudience === null ? "Tous mes amis actifs" : selectedAudience.type === "group" ? "Un groupe" : "Un ami"}
                </Text>
              </View>
              <ChevronDown size={18} color={colors.ink} strokeWidth={3} />
            </Pressable>
            {selectedAudience !== null ? (
              <View style={styles.chipRow}>
                {selectedAudience.type === "group" && selectedGroup !== undefined ? (
                  <HomeSelectionChip label={`Groupe · ${selectedGroup.name}`} onClear={() => setSelectedAudience(null)} />
                ) : null}
                {selectedAudience.type === "friend" && selectedFriend !== undefined ? (
                  <HomeSelectionChip label={`Ami · ${selectedFriend.pseudo}`} onClear={() => setSelectedAudience(null)} />
                ) : null}
              </View>
            ) : null}
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
            ? "Invitation deja en cours"
            : isArmed
              ? "Protection retirée"
              : "Swipe la protection, puis maintien"}
        </Text>
      </View>
      <HomeAudiencePickerModal
        open={audienceModalOpen}
        groups={friendGroups.data ?? []}
        friends={friends.data ?? []}
        loading={friendGroups.isLoading || friends.isLoading}
        expandedGroupIds={expandedGroupIds}
        onClose={() => setAudienceModalOpen(false)}
        onToggleGroup={(groupId) =>
          setExpandedGroupIds((current) =>
            current.includes(groupId) ? current.filter((entry) => entry !== groupId) : [...current, groupId]
          )
        }
        onSelectAll={() => {
          setSelectedAudience(null);
          setAudienceModalOpen(false);
          resetSafety();
        }}
        onSelectGroup={(groupId) => {
          setSelectedAudience({ type: "group", groupId });
          setAudienceModalOpen(false);
          resetSafety();
        }}
        onSelectFriend={(friendId) => {
          setSelectedAudience({ type: "friend", friendId });
          setAudienceModalOpen(false);
          resetSafety();
        }}
      />
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

function formatNotificationCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function FluxMenu({
  onClose,
  receivedInvitationCount,
  receivedFriendRequestCount
}: {
  onClose: () => void;
  receivedInvitationCount: number;
  receivedFriendRequestCount: number;
}) {
  const items = [
    { label: "Reçues", icon: Inbox, href: "/invitations/received", badgeCount: receivedInvitationCount },
    { label: "Créées", icon: Send, href: "/invitations/created", badgeCount: 0 },
    { label: "Amis", icon: Users, href: "/friends", badgeCount: receivedFriendRequestCount },
    { label: "Profil", icon: User, href: "/profile", badgeCount: 0 }
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
              {item.badgeCount > 0 ? (
                <View style={styles.menuItemBadge}>
                  <Text style={styles.menuItemBadgeText}>{formatNotificationCount(item.badgeCount)}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function HomeSelectionChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={onClear}>
        <X size={14} color={colors.ink} strokeWidth={3} />
      </Pressable>
    </View>
  );
}

function HomeAudiencePickerModal({
  open,
  groups,
  friends,
  loading,
  expandedGroupIds,
  onClose,
  onToggleGroup,
  onSelectAll,
  onSelectGroup,
  onSelectFriend
}: {
  open: boolean;
  groups: Array<{ id: string; name: string; members: Array<{ id: string; pseudo: string }> }>;
  friends: Array<{ id: string; pseudo: string; publicTag: string }>;
  loading: boolean;
  expandedGroupIds: string[];
  onClose: () => void;
  onToggleGroup: (groupId: string) => void;
  onSelectAll: () => void;
  onSelectGroup: (groupId: string) => void;
  onSelectFriend: (friendId: string) => void;
}) {
  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalScrim}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Limiter a</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <X size={22} color={colors.ink} strokeWidth={3} />
            </Pressable>
          </View>
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Tous</Text>
              <ListRow title="Tous mes amis actifs" subtitle="Aucune limitation" onPress={onSelectAll} />
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Mes groupes</Text>
              {groups.map((group) => {
                const isExpanded = expandedGroupIds.includes(group.id);

                return (
                  <View key={group.id} style={styles.groupCard}>
                    <View style={styles.groupCardHeader}>
                      <View style={styles.groupCardTitleBlock}>
                        <Text style={styles.groupCardTitle}>{group.name}</Text>
                        <Text style={styles.groupCardSubtitle}>{group.members.length} ami(s)</Text>
                      </View>
                      <View style={styles.groupCardActions}>
                        <Pressable accessibilityRole="button" onPress={() => onToggleGroup(group.id)} style={styles.miniButton}>
                          <Text style={styles.miniButtonText}>{isExpanded ? "Masquer" : "Voir"}</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => onSelectGroup(group.id)}
                          style={[styles.miniButton, styles.miniButtonActive]}
                        >
                          <Text style={styles.miniButtonText}>Choisir</Text>
                        </Pressable>
                      </View>
                    </View>
                    {isExpanded ? (
                      <View style={styles.memberList}>
                        {group.members.map((member) => (
                          <View key={member.id} style={styles.memberPill}>
                            <Text style={styles.memberPillText}>{member.pseudo}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Mes amis</Text>
              {friends.map((friend) => (
                <ListRow
                  key={friend.id}
                  title={friend.pseudo}
                  subtitle={friend.publicTag}
                  onPress={() => onSelectFriend(friend.id)}
                  right={<Text style={[styles.miniButtonText, { paddingHorizontal: spacing.xs }]}>Ami</Text>}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
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

type HomeAudienceSelection = { type: "group"; groupId: string } | { type: "friend"; friendId: string };

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
    justifyContent: "flex-start"
  },
  gearButton: {
    position: "relative",
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
  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: 11,
    lineHeight: 12,
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
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  menuItemBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5
  },
  menuItemBadgeText: {
    color: colors.white,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: "900"
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: borders.regular,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start"
  },
  chipText: {
    color: colors.ink,
    fontWeight: "900",
    fontSize: 11,
    textTransform: "uppercase"
  },
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

function sanitizeTimePart(value: string): string {
  return value.replace(/\D+/g, "").slice(0, 2);
}
