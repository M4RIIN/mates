import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/shared/theme";

type EmptyStateProps = {
  title: string;
  subtitle?: string;
};

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      {subtitle !== undefined ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14
  }
});
