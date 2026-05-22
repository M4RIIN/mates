import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompleteGoogleProfileRequest, GoogleAuthRequest, LoginRequest, RegisterRequest } from "@mates/shared";
import { useApiClient } from "./useApiClient";
import { useAuthStore } from "@/infrastructure/storage/auth-store";

export function useCurrentUser() {
  const api = useApiClient();
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);

  const query = useQuery({
    queryKey: ["me"],
    enabled: token !== null,
    queryFn: () => api.me()
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  return query;
}

export function useLogin() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: LoginRequest) => api.login(input),
    onSuccess: async (response) => {
      setSession(response.token, response.user);
      await queryClient.invalidateQueries();
    }
  });
}

export function useRegister() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: RegisterRequest) => api.register(input),
    onSuccess: async (response) => {
      setSession(response.token, response.user);
      await queryClient.invalidateQueries();
    }
  });
}

export function useAuthenticateWithGoogle() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: GoogleAuthRequest) => api.authenticateWithGoogle(input),
    onSuccess: async (response) => {
      if (response.status === "authenticated") {
        setSession(response.token, response.user);
        await queryClient.invalidateQueries();
      }
    }
  });
}

export function useCompleteGoogleProfile() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: CompleteGoogleProfileRequest) => api.completeGoogleProfile(input),
    onSuccess: async (response) => {
      setSession(response.token, response.user);
      await queryClient.invalidateQueries();
    }
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);

  return async () => {
    clearSession();
    await queryClient.clear();
  };
}
