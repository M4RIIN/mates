import { useEffect, useRef, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View
} from "react-native";
import { colors, layout, motion, spacing } from "@/shared/theme";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  dismissKeyboardOnPress?: boolean;
};

export function Screen({ children, scroll = true, contentStyle, dismissKeyboardOnPress = true }: ScreenProps) {
  const { width } = useWindowDimensions();
  const entrance = useRef(new Animated.Value(0)).current;
  const responsiveContentStyle = width <= layout.compactWidth ? styles.contentCompact : width >= layout.tabletWidth ? styles.contentWide : null;
  const entranceStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0]
        })
      }
    ]
  };

  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: motion.medium,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [entrance]);

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ExperienceBackdrop width={width} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={spacing.sm} style={styles.keyboardArea}>
          {dismissKeyboardOnPress ? (
            <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
              <View style={styles.fixedArea}>
                <Animated.View style={[styles.content, responsiveContentStyle, entranceStyle, contentStyle]}>{children}</Animated.View>
              </View>
            </TouchableWithoutFeedback>
          ) : (
            <View style={styles.fixedArea}>
              <Animated.View style={[styles.content, responsiveContentStyle, entranceStyle, contentStyle]}>{children}</Animated.View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExperienceBackdrop width={width} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={spacing.sm} style={styles.keyboardArea}>
        <ScrollView
          alwaysBounceVertical={false}
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scrollArea}
          decelerationRate="fast"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {dismissKeyboardOnPress ? (
            <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
              <Animated.View style={[styles.content, responsiveContentStyle, entranceStyle, contentStyle]}>{children}</Animated.View>
            </TouchableWithoutFeedback>
          ) : (
            <Animated.View style={[styles.content, responsiveContentStyle, entranceStyle, contentStyle]}>{children}</Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ExperienceBackdrop({ width }: { width: number }) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 7200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 7200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [drift]);

  const translateA = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  const translateB = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const rotate = drift.interpolate({ inputRange: [0, 1], outputRange: ["-7deg", "5deg"] });
  const accentSize = width < layout.compactWidth ? 128 : 178;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.gridLayer}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={`v-${index}`} style={[styles.gridLineVertical, { left: `${index * 25}%` }]} />
        ))}
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={`h-${index}`} style={[styles.gridLineHorizontal, { top: `${index * 20}%` }]} />
        ))}
      </View>
      <Animated.View
        style={[
          styles.shape,
          styles.bluePlane,
          {
            width: accentSize * 1.25,
            height: accentSize,
            transform: [{ translateY: translateA }, { rotate }]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.shape,
          styles.redDisc,
          {
            width: accentSize,
            height: accentSize,
            borderRadius: accentSize / 2,
            transform: [{ translateY: translateB }]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.shape,
          styles.yellowBeam,
          {
            width: accentSize * 1.45,
            transform: [{ translateY: translateA }, { rotate: "-13deg" }]
          }
        ]}
      />
      <View style={styles.bottomWash} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    position: "relative",
    backgroundColor: colors.background
  },
  keyboardArea: {
    flex: 1
  },
  fixedArea: {
    flexGrow: 1,
    flex: 1
  },
  scrollArea: {
    flexGrow: 1,
    paddingVertical: spacing.lg
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: layout.maxWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md
  },
  contentCompact: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm
  },
  contentWide: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg
  },
  shape: {
    position: "absolute",
    opacity: 0.1
  },
  gridLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.38
  },
  gridLineVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline
  },
  gridLineHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline
  },
  bluePlane: {
    top: 28,
    right: -92,
    borderRadius: 18,
    backgroundColor: colors.primary
  },
  redDisc: {
    top: "34%",
    left: -92,
    backgroundColor: colors.red
  },
  yellowBeam: {
    bottom: 84,
    right: -72,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.yellow
  },
  bottomWash: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 180,
    backgroundColor: colors.surface,
    opacity: 0.36
  }
});
