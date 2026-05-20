import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPlaceSearchProvider } from "@/infrastructure/places/create-place-search-provider";
import { useApiClient } from "./useApiClient";

export function usePlaceSearch(query: string) {
  const api = useApiClient();
  const provider = useMemo(() => createPlaceSearchProvider(api), [api]);
  const normalizedQuery = useDebouncedValue(query.trim(), 350);

  return useQuery({
    queryKey: ["places", normalizedQuery],
    enabled: normalizedQuery.length >= 3,
    queryFn: () => provider.search(normalizedQuery)
  });
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}
