import type { PlaceSearchProvider } from "@/application/places/place-search-provider";
import { appConfig } from "@/shared/config";
import { MapboxPlaceSearchProvider } from "./mapbox-place-search-provider";
import { MockPlaceSearchProvider } from "./mock-place-search-provider";

export function createPlaceSearchProvider(): PlaceSearchProvider {
  if (appConfig.placesProvider === "mapbox" && appConfig.mapboxAccessToken !== undefined) {
    return new MapboxPlaceSearchProvider(appConfig.mapboxAccessToken);
  }

  return new MockPlaceSearchProvider();
}
