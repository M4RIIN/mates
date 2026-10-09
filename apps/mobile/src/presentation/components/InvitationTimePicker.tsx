import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { AppButton } from "./AppButton";
import { getInvitationTimeError } from "@/domain/invitation/schedule";
import { useInvitationClock } from "@/presentation/hooks/useInvitationClock";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function InvitationTimePicker({ hour, minute, onClose, onConfirm }: {
  hour: string; minute: string; onClose: () => void; onConfirm: (hour: string, minute: string) => void;
}) {
  const [draftHour, setHour] = useState(hour);
  const [draftMinute, setMinute] = useState(minute);
  const now = useInvitationClock();
  const error = getInvitationTimeError(draftHour, draftMinute, now);
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}>
    <View style={styles.scrim}><View accessibilityViewIsModal style={styles.card}>
      <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>Aujourd’hui · {draftHour}:{draftMinute}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Annuler le choix de l’heure" onPress={onClose} style={styles.close}><X color={colors.ink} size={22} /></Pressable></View>
      <View style={styles.columns}><TimeColumn label="Heure" count={24} value={draftHour} update={setHour} /><TimeColumn label="Minute" count={60} value={draftMinute} update={setMinute} /></View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <AppButton title="Valider l’heure" disabled={error !== null} onPress={() => {
        if (getInvitationTimeError(draftHour, draftMinute) === null) onConfirm(draftHour, draftMinute);
      }} />
    </View></View>
  </Modal>;
}

function TimeColumn({ label, count, value, update }: { label: string; count: number; value: string; update: (value: string) => void }) {
  const scroll = useRef<ScrollView>(null);
  const initialOffset = useRef(Math.max(0, Number(value) - 1) * 44);
  const positioned = useRef(false);
  return <View style={styles.column}><Text style={styles.label}>{label}</Text>
    <ScrollView ref={scroll} style={styles.options} onContentSizeChange={() => {
      if (!positioned.current) { positioned.current = true; scroll.current?.scrollTo({ y: initialOffset.current, animated: false }); }
    }}>
      {Array.from({ length: count }, (_, i) => String(i).padStart(2, "0")).map((option) => (
        <Pressable key={option} accessibilityRole="radio" accessibilityLabel={`${label} ${option}`} accessibilityState={{ checked: value === option }}
          onPress={() => update(option)} style={[styles.option, value === option && styles.selected]}><Text style={styles.value}>{option}</Text></Pressable>
      ))}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: "center", padding: spacing.md, backgroundColor: "rgba(7, 26, 45, 0.3)" },
  card: { width: "100%", maxWidth: 460, maxHeight: "85%", alignSelf: "center", padding: spacing.md, gap: spacing.sm, borderRadius: radii.md, borderWidth: borders.regular, borderColor: colors.border, backgroundColor: colors.background },
  header: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  title: { flex: 1, color: colors.ink, fontSize: 20, fontWeight: "900" },
  close: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  columns: { flexDirection: "row", gap: spacing.md, flexShrink: 1 },
  column: { flex: 1, flexShrink: 1 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "800", paddingBottom: spacing.xs },
  options: { height: 220, flexShrink: 1 },
  option: { height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.md },
  selected: { backgroundColor: colors.blueSoft },
  value: { color: colors.ink, fontWeight: "800", fontSize: 20 },
  error: { color: colors.redPressed, fontSize: 14 }
});
