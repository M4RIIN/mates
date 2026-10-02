import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/infrastructure/storage/auth-store";
import { useApiClient } from "./useApiClient";

export function useCompleteOnboarding() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: () => api.completeOnboarding(),
    onSuccess: async (user) => {
      await queryClient.cancelQueries({ queryKey: ["me", user.id] });
      const session = useAuthStore.getState();
      if (session.token !== token || session.user?.id !== user.id) return;
      session.setUser(user);
      queryClient.setQueryData(["me", user.id], user);
    }
  });
}
