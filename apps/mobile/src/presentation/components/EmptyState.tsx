import { StyleSheet, Text, View } from "react-native";
import { borders, colors, radii, spacing } from "@/shared/theme";

type EmptyStateProps = {
  title: string;
  subtitle?: string;
};

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.art}>
        <View style={styles.redSquare} />
        <View style={styles.blueCircle} />
        <View style={styles.yellowBar} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle !== undefined ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  art: {
    width: 58,
    height: 58
  },
  redSquare: {
    position: "absolute",
    left: 0,
    top: 8,
    width: 30,
    height: 30,
    backgroundColor: colors.red,
    borderWidth: borders.regular,
    borderColor: colors.border
  },
  blueCircle: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    borderWidth: borders.regular,
    borderColor: colors.border
  },
  yellowBar: {
    position: "absolute",
    right: 2,
    bottom: 4,
    width: 46,
    height: 16,
    backgroundColor: colors.yellow,
    borderWidth: borders.regular,
    borderColor: colors.border
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 18,
    lineHeight: 22
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600"
  }
});
