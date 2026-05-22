import type { PlaceCandidate, PlaceSearchOptions, PlaceSearchPort } from "../ports/place-search-port.js";

export class SearchPlacesUseCase {
  constructor(private readonly placeSearch: PlaceSearchPort) {}

  execute(query: string, options?: PlaceSearchOptions): Promise<PlaceCandidate[]> {
    return this.placeSearch.search(query, options);
  }
}
