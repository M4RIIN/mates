import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRight, LockKeyhole, UnlockKeyhole } from "lucide-react-native";
import { shouldOpenInvitationCover } from "@/domain/invitation/safety-gate";
import { colors, radii, spacing } from "@/shared/theme";

type Props = {
  revision: number;
  armed: boolean; ready: boolean; holding: boolean; sending: boolean; compact: boolean;
  error: string | null;
  holdProgress: Animated.Value;
  onOpen: () => void; onClose: () => void; onHold: () => void; onRelease: () => void; onAccessibleSend: () => void;
};

export function ProtectedInvitationButton({ revision, armed, ready, holding, sending, error, compact, holdProgress, onOpen, onClose, onHold, onRelease, onAccessibleSend }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const [keyboardAccess, setKeyboardAccess] = useState(false);
  const cover = useRef(new Animated.Value(0)).current;
  const opening = useRef(false);
  const latest = useRef({ revision, ready, sending, onOpen });
  latest.current = { revision, ready, sending, onOpen };
  const gestureRevision = useRef(revision);
  const size = compact ? 220 : 250;
  const capSize = compact ? 166 : 190;
  const travel = capSize * 0.6;
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduceMotion(value); });
    // React Native Web reports true unconditionally; preserve the pointer hold on web.
    if (Platform.OS !== "web") void AccessibilityInfo.isScreenReaderEnabled().then((value) => { if (mounted) setScreenReader(value); });
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const reader = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader);
    return () => { mounted = false; motion.remove(); reader.remove(); };
  }, []);
  useEffect(() => {
    cover.stopAnimation();
    opening.current = false;
    if (reduceMotion) cover.setValue(armed ? 1 : 0);
    else Animated.spring(cover, { toValue: armed ? 1 : 0, tension: 110, friction: 18, useNativeDriver: true }).start();
  }, [revision, armed, ready, sending, reduceMotion, cover]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => ready && !armed && !sending && !opening.current,
    onMoveShouldSetPanResponder: (_, gesture) => ready && !armed && !sending && !opening.current && gesture.dx > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => { gestureRevision.current = latest.current.revision; cover.stopAnimation(); },
    onPanResponderTerminationRequest: (_, gesture) => Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => { if (!opening.current && gestureRevision.current === latest.current.revision) cover.setValue(Math.max(0, Math.min(1, gesture.dx / travel))); },
    onPanResponderRelease: (_, gesture) => {
      const complete = gestureRevision.current === latest.current.revision && latest.current.ready && !latest.current.sending && shouldOpenInvitationCover(gesture.dx, travel);
      opening.current = complete;
      const done = ({ finished }: { finished: boolean }) => {
        opening.current = false;
        if (finished && complete && gestureRevision.current === latest.current.revision && latest.current.ready && !latest.current.sending) latest.current.onOpen();
      };
      if (reduceMotion) { cover.setValue(complete ? 1 : 0); done({ finished: true }); }
      else Animated.spring(cover, { toValue: complete ? 1 : 0, tension: 110, friction: 18, useNativeDriver: true }).start(done);
    },
    onPanResponderTerminate: () => { opening.current = false; Animated.spring(cover, { toValue: 0, useNativeDriver: true }).start(); }
  }), [ready, armed, sending, travel, reduceMotion, cover]);

  const coverStyle = reduceMotion ? { opacity: armed ? 0 : 1 } : { transform: [
    { perspective: 650 }, { translateX: capSize / 2 },
    { rotateY: cover.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "82deg"] }) }, { translateX: -capSize / 2 }
  ] };
  const stateLabel = sending ? "Envoi en cours" : error ? "Envoi impossible · capot refermé" : holding ? "Maintien en cours" : armed ? "Capot ouvert · maintiens 1,15 s" : ready ? "Glisse le capot vers la droite" : "Complète ta sortie pour ouvrir le capot";
  useEffect(() => { if (screenReader) AccessibilityInfo.announceForAccessibility(stateLabel); }, [screenReader, stateLabel]);
  return <View style={styles.console}>
    <Text accessibilityLiveRegion="polite" style={styles.instruction}>{stateLabel}</Text>
    <View style={[styles.device, { width: size, height: size }]}>
      <View pointerEvents="none" style={styles.base}>
        {[styles.screwTL, styles.screwTR, styles.screwBL, styles.screwBR].map((position, index) => <View key={index} style={[styles.screw, position]}><View style={styles.slot} /></View>)}
        <View style={styles.ring} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={screenReader ? "Envoyer la sortie avec confirmation" : "Maintenir 1,15 seconde pour inviter mes amis"}
        accessibilityState={{ disabled: !armed || !ready || sending, busy: sending }} disabled={!armed || !ready || sending}
        onPressIn={screenReader ? undefined : onHold} onPressOut={screenReader ? undefined : onRelease} onTouchCancel={onRelease} onPress={(event) => {
          const nativeEvent = event.nativeEvent;
          const keyboard = Platform.OS === "web" && (("type" in nativeEvent && typeof nativeEvent.type === "string" && nativeEvent.type.startsWith("key")) || ("detail" in nativeEvent && nativeEvent.detail === 0));
          if (screenReader || keyboard) onAccessibleSend();
        }}
        style={({ pressed }) => [styles.button, { width: compact ? 126 : 148, height: compact ? 126 : 148, borderRadius: 80 }, pressed && armed && !reduceMotion && styles.pressed]}>
        {sending ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.buttonLabel}>{armed ? "INVITER" : "PROTÉGÉ"}</Text><Text style={styles.buttonHint}>{armed ? "Maintiens 1,15 s" : "Ouvre le capot"}</Text></>}
      </Pressable>
      <View pointerEvents="none" style={[styles.hinge, { right: (size - capSize) / 2 - 10 }]}><View style={styles.hingeLine} /></View>
      <View pointerEvents={armed || sending ? "none" : "auto"} style={[styles.coverArea, { width: capSize, height: capSize }]} {...pan.panHandlers}>
        <Animated.View pointerEvents="none" style={[styles.cover, { borderRadius: capSize / 2 }, coverStyle]}>
          <View style={styles.reflection} />
          <View style={styles.coverRim} />
          {!armed ? <View style={styles.coverHint}><LockKeyhole size={18} color={colors.ink} /><ArrowRight size={22} color={colors.ink} /></View> : null}
        </Animated.View>
        {reduceMotion && armed ? <View style={styles.openEdge} /> : null}
      </View>
    </View>
    <View accessibilityRole="progressbar" accessibilityLabel="Progression du maintien" accessibilityValue={{ min: 0, max: 1150, text: holding ? "Maintien en cours" : "Maintiens 1,15 seconde" }} style={styles.meter}>
      <Animated.View style={[styles.fill, { width: holdProgress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
    </View>
    {armed || screenReader || Platform.OS === "web" ? <Pressable accessibilityRole="button" accessibilityLabel={armed ? "Refermer le capot" : "Ouvrir le capot sans glisser"} accessibilityState={{ disabled: !ready || sending }} disabled={!ready || sending} onFocus={() => setKeyboardAccess(true)} onBlur={() => setKeyboardAccess(false)} onPress={armed ? onClose : onOpen} style={[styles.accessibleAction, !armed && !screenReader && !keyboardAccess && styles.keyboardOnly]}>
      {armed ? <LockKeyhole size={15} color={colors.ink} /> : <UnlockKeyhole size={15} color={colors.ink} />}<Text style={styles.actionLabel}>{armed ? "Refermer le capot" : "Ouvrir sans glisser"}</Text>
    </Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  console: { alignItems: "center", gap: spacing.xs },
  instruction: { color: colors.ink, fontSize: 13, fontWeight: "800", textAlign: "center" },
  device: { alignItems: "center", justifyContent: "center" },
  base: { position: "absolute", width: "92%", height: "92%", borderRadius: 26, borderWidth: 3, borderColor: colors.ink, backgroundColor: colors.yellow, alignItems: "center", justifyContent: "center", shadowColor: colors.ink, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 0, elevation: 3 },
  ring: { width: "83%", height: "83%", borderRadius: 120, borderWidth: 4, borderColor: "#CA9B1B", backgroundColor: "#FFE583" },
  screw: { position: "absolute", width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: "#65717C", backgroundColor: "#DAE1E4", alignItems: "center", justifyContent: "center" },
  slot: { width: 8, height: 2, backgroundColor: "#65717C", transform: [{ rotate: "-35deg" }] },
  screwTL: { top: 12, left: 12 }, screwTR: { top: 12, right: 12 }, screwBL: { bottom: 12, left: 12 }, screwBR: { bottom: 12, right: 12 },
  button: { borderWidth: 4, borderColor: "#8F211C", backgroundColor: colors.red, justifyContent: "center", alignItems: "center", shadowColor: "#8F211C", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  pressed: { transform: [{ scale: 0.97 }, { translateY: 3 }] },
  buttonLabel: { color: colors.white, fontSize: 17, fontWeight: "900" }, buttonHint: { color: colors.white, fontSize: 11, marginTop: 4, fontWeight: "700" },
  hinge: { position: "absolute", width: 26, height: 48, borderRadius: 8, backgroundColor: "rgba(206, 224, 232, 0.85)", borderWidth: 2, borderColor: "#8097A5", justifyContent: "center", alignItems: "center" }, hingeLine: { width: 3, height: 38, backgroundColor: "#8097A5" },
  coverArea: { position: "absolute", zIndex: 10 },
  cover: { width: "100%", height: "100%", borderWidth: 4, borderColor: "rgba(121, 149, 166, 0.9)", backgroundColor: "rgba(223, 241, 248, 0.22)", backfaceVisibility: "hidden", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  coverRim: { position: "absolute", top: 7, right: 7, bottom: 7, left: 7, borderRadius: 110, borderWidth: 2, borderColor: "rgba(255, 255, 255, 0.65)" },
  reflection: { position: "absolute", width: "125%", height: 20, top: 35, backgroundColor: "rgba(255, 255, 255, 0.48)", transform: [{ rotate: "-35deg" }] },
  coverHint: { position: "absolute", bottom: 16, flexDirection: "row", gap: 6, padding: 4, borderRadius: radii.pill, backgroundColor: "rgba(255, 255, 255, 0.85)" },
  openEdge: { position: "absolute", right: 0, width: 12, height: "100%", borderRadius: 6, borderWidth: 2, borderColor: "#8097A5", backgroundColor: "rgba(223, 241, 248, 0.5)" },
  meter: { height: 9, width: 180, borderWidth: 1, borderColor: colors.ink, borderRadius: 5, overflow: "hidden", backgroundColor: colors.surface }, fill: { height: "100%", backgroundColor: colors.primary },
  accessibleAction: { minHeight: 44, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm }, actionLabel: { fontSize: 12, color: colors.ink, fontWeight: "700" }
  , keyboardOnly: { position: "absolute", width: 1, height: 1, minHeight: 0, paddingHorizontal: 0, overflow: "hidden", opacity: 0 }
});
