import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/infrastructure/api/query-client";
import { useAuthStore } from "@/infrastructure/storage/auth-store";
import { useNotificationNavigation } from "@/presentation/hooks/usePushNotifications";
import { colors } from "@/shared/theme";

export default function RootLayout() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = hasHydrated && token !== null;
  const isGuest = hasHydrated && token === null;
  useNotificationNavigation();

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerBackTitle: "Retour",
          headerTintColor: colors.ink,
          headerShadowVisible: false,
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
          <Stack.Screen name="home" options={{ title: "Accueil" }} />
          <Stack.Screen name="profile" options={{ title: "Profil" }} />
          <Stack.Screen name="friends/index" options={{ title: "Amis" }} />
          <Stack.Screen name="friends/add" options={{ title: "Ajouter" }} />
          <Stack.Screen name="create-call/index" options={{ title: "Invitation" }} />
          <Stack.Screen name="invitations/created/index" options={{ title: "Créées" }} />
          <Stack.Screen name="invitations/created/[id]" options={{ title: "Détail" }} />
          <Stack.Screen name="invitations/received/index" options={{ title: "Reçues" }} />
          <Stack.Screen name="invitations/received/[id]" options={{ title: "Répondre" }} />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
