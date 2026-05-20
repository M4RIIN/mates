import type { PlaceSearchProvider } from "@/application/places/place-search-provider";
import type { Place } from "@/domain/place/place";
import type { ApiClient } from "@/infrastructure/api/api-client";

export class ApiPlaceSearchProvider implements PlaceSearchProvider {
  constructor(private readonly api: ApiClient) {}

  search(query: string): Promise<Place[]> {
    return this.api.searchPlaces(query);
  }
}
