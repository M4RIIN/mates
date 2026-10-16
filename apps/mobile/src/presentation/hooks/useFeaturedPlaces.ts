import { useQuery } from "@tanstack/react-query";
import type { Coordinates } from "@/domain/place/coordinates";
import { useApiClient } from "./useApiClient";

export function useFeaturedPlaces(position: Coordinates | null, enabled: boolean) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["featured-places", position?.latitude, position?.longitude],
    enabled: enabled && position !== null,
    retry: false,
    staleTime: 0,
    queryFn: () => api.getFeaturedPlaces(position!)
  });
}
