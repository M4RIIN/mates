import { useRef, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { borders, colors, radii, spacing } from "@/shared/theme";

type ListRowProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
};

export function ListRow({ title, subtitle, right, onPress }: ListRowProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const isInteractive = onPress !== undefined;

  function setPressed(pressed: boolean) {
    if (!isInteractive) {
      return;
    }

    Animated.spring(scale, {
      toValue: pressed ? 0.992 : 1,
      speed: 24,
      bounciness: 3,
      useNativeDriver: true
    }).start();
  }

  return (
    <Pressable
      accessibilityRole={isInteractive ? "button" : "text"}
      disabled={!isInteractive}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <Animated.View style={[styles.row, { transform: [{ scale }] }]}>
        <View style={styles.marker}>
          <View style={styles.markerDot} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          {subtitle !== undefined ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right ?? (isInteractive ? <ChevronRight size={20} color={colors.ink} strokeWidth={3} /> : null)}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: borders.regular,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 0,
    elevation: 2
  },
  marker: {
    width: 12,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    borderWidth: borders.regular,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  markerDot: {
    width: 6,
    height: 18,
    borderRadius: 3,
    backgroundColor: colors.yellow
  },
  texts: {
    flex: 1,
    gap: spacing.xxs
  },
  title: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 17,
    lineHeight: 22
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600"
  },
});
