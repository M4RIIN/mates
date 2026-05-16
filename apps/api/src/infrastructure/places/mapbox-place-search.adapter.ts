import type { PlaceCandidate, PlaceSearchPort } from "../../application/ports/place-search-port.js";

type MapboxFeature = {
  id: string;
  properties?: {
    name?: string;
    full_address?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

type MapboxSearchResponse = {
  features?: MapboxFeature[];
};

export class MapboxPlaceSearchAdapter implements PlaceSearchPort {
  constructor(private readonly accessToken: string) {}

  async search(query: string): Promise<PlaceCandidate[]> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      return [];
    }

    const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
    url.searchParams.set("q", trimmedQuery);
    url.searchParams.set("access_token", this.accessToken);
    url.searchParams.set("session_token", "server");

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox search failed with status ${response.status}`);
    }

    const payload = (await response.json()) as MapboxSearchResponse;
    return (payload.features ?? []).map((feature) => {
      const coordinates = feature.geometry?.coordinates;

      return {
        id: feature.id,
        name: feature.properties?.name ?? "Lieu sans nom",
        address: feature.properties?.full_address ?? null,
        longitude: coordinates?.[0] ?? null,
        latitude: coordinates?.[1] ?? null
      };
    });
  }
}
