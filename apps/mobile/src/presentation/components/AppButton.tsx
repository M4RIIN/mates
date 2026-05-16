import { useRef, type ReactNode } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { borders, colors, radii, spacing } from "@/shared/theme";

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
  const usesDarkText = variant === "secondary" || variant === "success";
  const scale = useRef(new Animated.Value(1)).current;

  function animatePress(toValue: number) {
    Animated.spring(scale, {
      toValue,
      speed: 24,
      bounciness: 4,
      useNativeDriver: true
    }).start();
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => {
        if (!isDisabled) {
          animatePress(0.985);
        }
      }}
      onPressOut={() => {
        animatePress(1);
      }}
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.button,
          styles[variant],
          big ? styles.big : null,
          isDisabled ? styles.disabled : null,
          { transform: [{ scale }] }
        ]}
      >
        {loading ? (
          <ActivityIndicator color={usesDarkText ? colors.ink : colors.white} />
        ) : (
          <View style={[styles.content, big ? styles.bigContent : null]}>
            {icon}
            <Text style={[styles.title, usesDarkText ? styles.titleDark : null, big ? styles.bigTitle : null]} numberOfLines={2}>
              {title}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%"
  },
  button: {
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 0,
    elevation: 3
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    maxWidth: "100%"
  },
  bigContent: {
    flexDirection: "column",
    alignItems: "flex-start",
    width: "100%"
  },
  title: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 16,
    lineHeight: 20,
    textAlign: "center",
    textTransform: "uppercase"
  },
  titleDark: {
    color: colors.ink
  },
  bigTitle: {
    fontSize: 28,
    lineHeight: 32,
    textAlign: "left"
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.surface
  },
  danger: {
    backgroundColor: colors.red
  },
  success: {
    backgroundColor: colors.yellow
  },
  big: {
    width: "100%",
    minHeight: 134,
    borderRadius: radii.md,
    alignSelf: "stretch",
    marginVertical: spacing.sm,
    padding: spacing.lg,
    justifyContent: "flex-end"
  },
  disabled: {
    opacity: 0.48
  }
});
