import type { PlaceCandidate, PlaceSearchOptions, PlaceSearchPort } from "../../application/ports/place-search-port.js";

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

  async search(query: string, options: PlaceSearchOptions = {}): Promise<PlaceCandidate[]> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      return [];
    }

    const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
    url.searchParams.set("q", trimmedQuery);
    url.searchParams.set("access_token", this.accessToken);
    url.searchParams.set("limit", String(toLimit(options.limit)));
    url.searchParams.set("session_token", "server");
    if (options.countryCode !== undefined) {
      url.searchParams.set("country", options.countryCode.toLowerCase());
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox search failed with status ${response.status}`);
    }

    const payload = (await response.json()) as MapboxSearchResponse;
    return (payload.features ?? []).map((feature) => {
      const coordinates = feature.geometry?.coordinates;

      return {
        id: feature.id,
        name: truncate(feature.properties?.name ?? "Lieu sans nom", 160),
        address: toNullableTruncatedValue(feature.properties?.full_address ?? null, 240),
        longitude: coordinates?.[0] ?? null,
        latitude: coordinates?.[1] ?? null
      };
    });
  }
}

function toLimit(value: number | undefined): number {
  return Math.min(10, Math.max(1, value ?? 8));
}

function toNullableTruncatedValue(value: string | null, maxLength: number): string | null {
  return value !== null ? truncate(value, maxLength) : null;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
