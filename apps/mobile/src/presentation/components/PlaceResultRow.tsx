import { ChevronRight, MapPin } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { borders, colors, radii, spacing } from "@/shared/theme";

type PlaceResultRowProps = {
  title: string;
  subtitle?: string;
  onPress: () => void;
};

export function PlaceResultRow({ title, subtitle, onPress }: PlaceResultRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <View style={styles.iconBox}>
        <MapPin size={16} color={colors.ink} strokeWidth={3} />
      </View>
      <View style={styles.texts}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle !== undefined ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={16} color={colors.muted} strokeWidth={3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 54,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceStrong,
    borderWidth: borders.regular,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  rowPressed: {
    backgroundColor: colors.blueSoft,
    transform: [{ scale: 0.992 }]
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.yellow,
    borderWidth: borders.regular,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  texts: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 15,
    lineHeight: 19
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700"
  }
});
