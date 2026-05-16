import type { PlaceSearchProvider } from "@/application/places/place-search-provider";
import type { Place } from "@/domain/place/place";

const MOCK_PLACES: Place[] = [
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
  },
  {
    id: "mock-pizzeria",
    name: "Pizzeria Minuit",
    address: "8 place Saint-Paul",
    latitude: 48.855,
    longitude: 2.361
  }
];

export class MockPlaceSearchProvider implements PlaceSearchProvider {
  async search(query: string): Promise<Place[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 2) {
      return [];
    }

    return MOCK_PLACES.filter((place) => place.name.toLowerCase().includes(normalizedQuery));
  }
}
