import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppNavigation, ProfileHeaderButton } from "@/presentation/components/AppNavigation";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/infrastructure/api/query-client";
import { useAuthStore } from "@/infrastructure/storage/auth-store";
import { useNotificationNavigation, useRegisterPushNotifications } from "@/presentation/hooks/usePushNotifications";
import { useRealtimeUpdates } from "@/presentation/hooks/useRealtimeUpdates";
import { colors } from "@/shared/theme";

export default function RootLayout() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = hasHydrated && token !== null;
  const isGuest = hasHydrated && token === null;

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBridge />
      <NotificationBridge />
      <View style={styles.shell}>
        <View style={styles.content}>
          <Stack
            screenOptions={{
              headerBackTitle: "Retour",
              headerTintColor: colors.ink,
              headerShadowVisible: false,
              headerRight: () => isAuthenticated ? <ProfileHeaderButton /> : null,
              headerStyle: {
                backgroundColor: colors.background
              },
              headerTitleStyle: {
                color: colors.ink,
                fontWeight: "900"
              },
              animation: "fade_from_bottom",
              animationDuration: 260,
              gestureEnabled: true,
              contentStyle: {
                backgroundColor: colors.background
              }
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Protected guard={isGuest}>
              <Stack.Screen name="auth/login" options={{ headerShown: false }} />
              <Stack.Screen name="auth/register" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={isAuthenticated}>
              <Stack.Screen name="home" options={{ title: "Proposer", headerBackVisible: false, headerLeft: () => null }} />
              <Stack.Screen name="sorties" options={{ title: "Sorties", headerBackVisible: false, headerLeft: () => null }} />
              <Stack.Screen name="profile" options={{ title: "Profil", headerRight: () => null }} />
              <Stack.Screen name="friends/index" options={{ title: "Amis", headerBackVisible: false, headerLeft: () => null }} />
              <Stack.Screen name="friends/add" options={{ title: "Ajouter" }} />
              <Stack.Screen name="friends/groups/index" options={{ title: "Groupes" }} />
              <Stack.Screen name="friends/groups/[id]" options={{ title: "Modifier le groupe" }} />
              <Stack.Screen name="invitations/created/index" options={{ title: "Créées" }} />
              <Stack.Screen name="invitations/created/[id]" options={{ title: "Détail" }} />
              <Stack.Screen name="invitations/received/index" options={{ title: "Reçues" }} />
              <Stack.Screen name="invitations/received/[id]" options={{ title: "Répondre" }} />
            </Stack.Protected>
          </Stack>
        </View>
        {isAuthenticated ? <AppNavigation /> : null}
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 }
});

function RealtimeBridge() {
  useRealtimeUpdates();
  return null;
}

function NotificationBridge() {
  useRegisterPushNotifications();
  useNotificationNavigation();
  return null;
}
