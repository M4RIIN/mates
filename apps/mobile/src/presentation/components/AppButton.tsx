import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/shared/theme";

type ButtonVariant = "primary" | "secondary" | "danger" | "success";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  big?: boolean;
  icon?: ReactNode;
};

export function AppButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  big = false,
  icon
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        big ? styles.big : null,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.title, big ? styles.bigTitle : null]} numberOfLines={2}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  title: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center"
  },
  bigTitle: {
    fontSize: 24,
    textTransform: "uppercase"
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.ink
  },
  danger: {
    backgroundColor: colors.red
  },
  success: {
    backgroundColor: colors.green
  },
  big: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignSelf: "center",
    marginVertical: spacing.xl
  },
  pressed: {
    opacity: 0.86
  },
  disabled: {
    opacity: 0.5
  }
});
