export const appConfig = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  placesProvider: process.env.EXPO_PUBLIC_PLACES_PROVIDER ?? "mock",
  mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
} as const;
