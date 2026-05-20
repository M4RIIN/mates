type PlacesProviderName = "api" | "mapbox" | "mock";

function resolvePlacesProvider(value: string | undefined): PlacesProviderName {
  if (value === "mapbox" || value === "mock") {
    return value;
  }

  return "api";
}

function resolveOptionalEnv(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue !== undefined && trimmedValue.length > 0 ? trimmedValue : undefined;
}

export const appConfig = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  placesProvider: resolvePlacesProvider(process.env.EXPO_PUBLIC_PLACES_PROVIDER),
  mapboxAccessToken: resolveOptionalEnv(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN)
} as const;
