type PlacesProviderName = "api" | "mapbox" | "mock";

function resolveBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  const trimmedValue = value?.trim().toLowerCase();
  if (trimmedValue === undefined || trimmedValue.length === 0) {
    return defaultValue;
  }

  if (trimmedValue === "true" || trimmedValue === "1" || trimmedValue === "yes" || trimmedValue === "on") {
    return true;
  }

  if (trimmedValue === "false" || trimmedValue === "0" || trimmedValue === "no" || trimmedValue === "off") {
    return false;
  }

  return defaultValue;
}

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
  passwordAuthEnabled: resolveBooleanEnv(process.env.EXPO_PUBLIC_AUTH_PASSWORD_ENABLED, true),
  placesProvider: resolvePlacesProvider(process.env.EXPO_PUBLIC_PLACES_PROVIDER),
  mapboxAccessToken: resolveOptionalEnv(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN),
  googleWebClientId: resolveOptionalEnv(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
  googleIosClientId: resolveOptionalEnv(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
  googleAndroidClientId: resolveOptionalEnv(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID)
} as const;
