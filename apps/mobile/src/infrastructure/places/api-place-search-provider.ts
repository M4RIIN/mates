import type { PlaceSearchOptions, PlaceSearchProvider } from "@/application/places/place-search-provider";
import type { Place } from "@/domain/place/place";
import type { ApiClient } from "@/infrastructure/api/api-client";

export class ApiPlaceSearchProvider implements PlaceSearchProvider {
  constructor(private readonly api: ApiClient) {}

  search(query: string, options?: PlaceSearchOptions): Promise<Place[]> {
    return this.api.searchPlaces(query, options);
  }
}
