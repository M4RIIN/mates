import type { PlaceCandidate, PlaceSearchPort } from "../../application/ports/place-search-port.js";

const DEFAULT_PLACES: PlaceCandidate[] = [
  {
    id: "mock-cafe-central",
    name: "Cafe Central",
    address: "12 rue du Centre",
    latitude: 48.8566,
    longitude: 2.3522
  },
  {
    id: "mock-bar-du-coin",
    name: "Bar du Coin",
    address: "4 avenue des Amis",
    latitude: 48.8571,
    longitude: 2.35
  }
];

export class MockPlaceSearchAdapter implements PlaceSearchPort {
  async search(query: string): Promise<PlaceCandidate[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return [];
    }

    return DEFAULT_PLACES.filter((place) => place.name.toLowerCase().includes(normalizedQuery));
  }
}
