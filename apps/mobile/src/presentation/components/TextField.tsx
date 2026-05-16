import { useState } from "react";
import type { TextInputProps } from "react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { borders, colors, radii, spacing } from "@/shared/theme";

type TextFieldProps = TextInputProps & {
  label: string;
  compact?: boolean;
};

export function TextField({ label, compact = false, style, onBlur, onFocus, ...props }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, compact ? styles.wrapperCompact : null]}>
      <Text style={[styles.label, compact ? styles.labelCompact : null]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        selectionColor={colors.primary}
        style={[styles.input, compact ? styles.inputCompact : null, focused ? styles.focused : null, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs
  },
  wrapperCompact: {
    gap: spacing.xxs
  },
  label: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase"
  },
  labelCompact: {
    fontSize: 11,
    lineHeight: 14
  },
  input: {
    minHeight: 56,
    borderWidth: borders.regular,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 17,
    fontWeight: "700"
  },
  inputCompact: {
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    fontSize: 15
  },
  focused: {
    backgroundColor: colors.white,
    borderColor: colors.primary
  }
});
