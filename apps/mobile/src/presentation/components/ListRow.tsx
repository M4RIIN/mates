import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors, spacing } from "@/shared/theme";

type ListRowProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
};

export function ListRow({ title, subtitle, right, onPress }: ListRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress === undefined ? "text" : "button"}
      disabled={onPress === undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {subtitle !== undefined ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress !== undefined ? <ChevronRight size={18} color={colors.muted} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  texts: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14
  },
  pressed: {
    opacity: 0.8
  }
});
