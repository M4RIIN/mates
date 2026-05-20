import type { PlaceCandidate, PlaceSearchPort } from "../ports/place-search-port.js";

export class SearchPlacesUseCase {
  constructor(private readonly placeSearch: PlaceSearchPort) {}

  execute(query: string): Promise<PlaceCandidate[]> {
    return this.placeSearch.search(query);
  }
}
