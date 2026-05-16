import type { ViewStyle } from "react-native";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { borders, colors, layout, radii, spacing } from "@/shared/theme";

type HeaderTone = "blue" | "red" | "yellow";

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  tone?: HeaderTone;
  compact?: boolean;
};

const toneStyles: Record<HeaderTone, ViewStyle> = {
  blue: { backgroundColor: colors.primary },
  red: { backgroundColor: colors.red },
  yellow: { backgroundColor: colors.yellow }
};

export function PageHeader({ title, eyebrow, subtitle, tone = "blue", compact = false }: PageHeaderProps) {
  const { width } = useWindowDimensions();
  const isNarrow = width <= layout.compactWidth;
  const titleStyle = compact ? (isNarrow ? styles.compactTitleNarrow : styles.compactTitle) : isNarrow ? styles.titleNarrow : styles.title;

  return (
    <View style={[styles.wrapper, compact ? styles.compactWrapper : null]}>
      <View style={styles.topLine}>
        {eyebrow !== undefined && eyebrow.length > 0 ? <Text style={styles.eyebrow}>{eyebrow}</Text> : <View />}
        <View style={[styles.tonePill, toneStyles[tone]]} />
      </View>
      <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={compact ? 3 : 2} style={titleStyle}>
        {title}
      </Text>
      {subtitle !== undefined && subtitle.length > 0 ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.posterMark} pointerEvents="none">
        <View style={[styles.markBlock, toneStyles[tone]]} />
        <View style={styles.markCircle} />
        <View style={styles.markRule} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: borders.regular,
    borderBottomColor: colors.border,
    gap: spacing.xs,
    overflow: "hidden"
  },
  compactWrapper: {
    paddingTop: 0,
    paddingBottom: spacing.sm
  },
  topLine: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  tonePill: {
    width: 52,
    height: 14,
    borderRadius: 7,
    borderWidth: borders.regular,
    borderColor: colors.border
  },
  posterMark: {
    position: "absolute",
    right: 6,
    bottom: 10,
    height: 44,
    width: 120,
    opacity: 0.18
  },
  markBlock: {
    position: "absolute",
    left: 0,
    top: 8,
    width: 42,
    height: 34,
    borderRadius: radii.sm,
    borderWidth: borders.regular,
    borderColor: colors.border
  },
  markCircle: {
    position: "absolute",
    left: 34,
    top: 0,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.red,
    borderWidth: borders.regular,
    borderColor: colors.border
  },
  markRule: {
    position: "absolute",
    right: 0,
    bottom: 5,
    width: 48,
    height: 14,
    backgroundColor: colors.yellow,
    borderWidth: borders.regular,
    borderColor: colors.border
  },
  eyebrow: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: colors.text,
    fontSize: 44,
    lineHeight: 46,
    maxWidth: "88%",
    fontWeight: "900"
  },
  titleNarrow: {
    color: colors.text,
    fontSize: 38,
    lineHeight: 40,
    maxWidth: "100%",
    fontWeight: "900"
  },
  compactTitle: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 36,
    maxWidth: "92%",
    fontWeight: "900"
  },
  compactTitleNarrow: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 32,
    maxWidth: "100%",
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700"
  }
});
