import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, MapPin } from "lucide-react-native";
import type { InvitationDetailsDto } from "@mates/shared";
import { formatTime } from "@/shared/date-format";
import { borders, colors, radii, spacing } from "@/shared/theme";

export function ActiveInvitationBanner({ invitation, onPress }: {
  invitation: InvitationDetailsDto;
  onPress: () => void;
}) {
  const confirmedCount = invitation.recipients.filter((recipient) => recipient.responseStatus === "yes").length;
  const time = formatTime(invitation.scheduledAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sortie en cours : ${invitation.placeName}, ${time}`}
      accessibilityHint="Ouvrir le détail de la sortie"
      onPress={onPress}
      style={({ pressed }) => [styles.banner, pressed ? styles.pressed : null]}
    >
      <View style={styles.icon}><MapPin size={22} color={colors.ink} strokeWidth={2.5} /></View>
      <View style={styles.copy}>
        <Text style={styles.label}>SORTIE EN COURS</Text>
        <Text style={styles.place}>{invitation.placeName}</Text>
        <Text style={styles.details}>
          {time} · {confirmedCount}/{invitation.recipients.length} confirmations
        </Text>
      </View>
      <ChevronRight size={23} color={colors.white} strokeWidth={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.ink, borderWidth: borders.regular, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm },
  pressed: { opacity: 0.8 },
  icon: { width: 42, height: 42, borderRadius: radii.pill, backgroundColor: colors.yellow, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 3 },
  label: { color: colors.yellow, fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  place: { color: colors.white, fontSize: 17, fontWeight: "900" },
  details: { color: colors.blueSoft, fontSize: 12, fontWeight: "600" }
});
