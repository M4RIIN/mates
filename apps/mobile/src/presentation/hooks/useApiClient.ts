import { useMemo } from "react";
import { ApiClient } from "@/infrastructure/api/api-client";
import { useAuthStore } from "@/infrastructure/storage/auth-store";
import { appConfig } from "@/shared/config";

export function useApiClient(): ApiClient {
  const token = useAuthStore((state) => state.token);

  return useMemo(() => new ApiClient(appConfig.apiUrl, token), [token]);
}
