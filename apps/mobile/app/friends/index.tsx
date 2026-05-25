import { Stack, router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { Users } from "lucide-react-native";
import { FriendsScreen } from "@/presentation/screens/FriendsScreen";
import { borders, colors, radii, spacing } from "@/shared/theme";

export default function FriendsRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" onPress={() => router.push("/friends/groups")} style={styles.headerButton}>
              <Users size={16} color={colors.ink} strokeWidth={3} />
              <Text style={styles.headerButtonText}>Groupes</Text>
            </Pressable>
          )
        }}
      />
      <FriendsScreen />
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: borders.regular,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.yellow
  },
  headerButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  }
});
