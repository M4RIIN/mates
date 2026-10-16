import { mergePlaceResults } from "@mates/shared";
import type { PlaceSearchProvider } from "@/application/places/place-search-provider";
import type { ApiClient } from "@/infrastructure/api/api-client";
import { appConfig } from "@/shared/config";
import { ApiPlaceSearchProvider } from "./api-place-search-provider";
import { MapboxPlaceSearchProvider } from "./mapbox-place-search-provider";
import { MockPlaceSearchProvider } from "./mock-place-search-provider";

export function createPlaceSearchProvider(api: ApiClient): PlaceSearchProvider {
  if (appConfig.placesProvider === "mock") {
    return withCatalog(new MockPlaceSearchProvider(), api);
  }

  if (appConfig.placesProvider === "mapbox" && appConfig.mapboxAccessToken !== undefined) {
    return withCatalog(new MapboxPlaceSearchProvider(appConfig.mapboxAccessToken), api);
  }

  return new ApiPlaceSearchProvider(api);
}

function withCatalog(provider: PlaceSearchProvider, api: ApiClient): PlaceSearchProvider {
  return { async search(query, options) {
    const [external, catalog] = await Promise.allSettled([provider.search(query, options), api.searchCatalogPlaces(query, options?.limit ?? 8)]);
    if (external.status === "rejected" && (catalog.status === "rejected" || catalog.value.length === 0)) throw external.reason;
    return mergePlaceResults(external.status === "fulfilled" ? external.value : [], catalog.status === "fulfilled" ? catalog.value : [], query, options?.limit ?? 8);
  } };
}
