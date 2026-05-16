import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPlaceSearchProvider } from "@/infrastructure/places/create-place-search-provider";

export function usePlaceSearch(query: string) {
  const provider = useMemo(() => createPlaceSearchProvider(), []);
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: ["places", normalizedQuery],
    enabled: normalizedQuery.length >= 2,
    queryFn: () => provider.search(normalizedQuery)
  });
}
