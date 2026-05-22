import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { createPlaceSearchProvider } from "@/infrastructure/places/create-place-search-provider";
import { useApiClient } from "./useApiClient";

const placeSearchLimit = 8;

export function usePlaceSearch(query: string) {
  const api = useApiClient();
  const provider = useMemo(() => createPlaceSearchProvider(api), [api]);
  const normalizedQuery = useDebouncedValue(query.trim(), 350);
  const countryCode = useCurrentCountryCode(normalizedQuery.length >= 3);

  return useQuery({
    queryKey: ["places", normalizedQuery, countryCode],
    enabled: normalizedQuery.length >= 3,
    queryFn: () =>
      provider.search(
        normalizedQuery,
        countryCode !== null ? { countryCode, limit: placeSearchLimit } : { limit: placeSearchLimit }
      )
  });
}

function useCurrentCountryCode(enabled: boolean): string | null {
  const localeCountryCode = useMemo(() => resolveLocaleCountryCode(), []);
  const [countryCode, setCountryCode] = useState<string | null>(localeCountryCode);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;

    async function resolveLocationCountryCode() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          return;
        }

        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
        const [address] = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        const resolvedCountryCode = normalizeCountryCode(address?.isoCountryCode ?? undefined);

        if (isMounted && resolvedCountryCode !== undefined) {
          setCountryCode(resolvedCountryCode);
        }
      } catch {
        if (isMounted && localeCountryCode !== null) {
          setCountryCode(localeCountryCode);
        }
      }
    }

    resolveLocationCountryCode();

    return () => {
      isMounted = false;
    };
  }, [enabled, localeCountryCode]);

  return countryCode;
}

function resolveLocaleCountryCode(): string | null {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const region = locale
    .replace(/_/g, "-")
    .split("-")
    .slice(1)
    .find((part) => /^[a-z]{2}$/i.test(part));

  return normalizeCountryCode(region) ?? null;
}

function normalizeCountryCode(value: string | undefined): string | undefined {
  if (value === undefined || !/^[a-z]{2}$/i.test(value)) {
    return undefined;
  }

  return value.toUpperCase();
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
