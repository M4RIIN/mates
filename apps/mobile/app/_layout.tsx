import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/infrastructure/api/query-client";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerBackTitle: "Retour",
          headerTintColor: "#171717",
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: "#F7F7F4"
          }
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ title: "Accueil" }} />
        <Stack.Screen name="profile" options={{ title: "Profil" }} />
        <Stack.Screen name="friends/index" options={{ title: "Amis" }} />
        <Stack.Screen name="friends/add" options={{ title: "Ajouter" }} />
        <Stack.Screen name="create-call/index" options={{ title: "Invitation" }} />
        <Stack.Screen name="invitations/created/index" options={{ title: "Créées" }} />
        <Stack.Screen name="invitations/created/[id]" options={{ title: "Détail" }} />
        <Stack.Screen name="invitations/received/index" options={{ title: "Reçues" }} />
        <Stack.Screen name="invitations/received/[id]" options={{ title: "Répondre" }} />
      </Stack>
    </QueryClientProvider>
  );
}
