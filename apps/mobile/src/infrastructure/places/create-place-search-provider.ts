import type { PlaceSearchProvider } from "@/application/places/place-search-provider";
import type { ApiClient } from "@/infrastructure/api/api-client";
import { appConfig } from "@/shared/config";
import { ApiPlaceSearchProvider } from "./api-place-search-provider";
import { MapboxPlaceSearchProvider } from "./mapbox-place-search-provider";
import { MockPlaceSearchProvider } from "./mock-place-search-provider";

export function createPlaceSearchProvider(api: ApiClient): PlaceSearchProvider {
  if (appConfig.placesProvider === "mock") {
    return new MockPlaceSearchProvider();
  }

  if (appConfig.placesProvider === "mapbox" && appConfig.mapboxAccessToken !== undefined) {
    return new MapboxPlaceSearchProvider(appConfig.mapboxAccessToken);
  }

  return new ApiPlaceSearchProvider(api);
}
