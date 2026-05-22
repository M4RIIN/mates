import type { PlaceSearchOptions, PlaceSearchProvider } from "@/application/places/place-search-provider";
import type { Place } from "@/domain/place/place";

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

type MapboxResponse = {
  features?: MapboxFeature[];
};

export class MapboxPlaceSearchProvider implements PlaceSearchProvider {
  constructor(private readonly accessToken: string) {}

  async search(query: string, options: PlaceSearchOptions = {}): Promise<Place[]> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      return [];
    }

    const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
    url.searchParams.set("q", trimmedQuery);
    url.searchParams.set("access_token", this.accessToken);
    url.searchParams.set("limit", String(toLimit(options.limit)));
    if (options.countryCode !== undefined) {
      url.searchParams.set("country", options.countryCode.toLowerCase());
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Mapbox search failed with status ${response.status}`);
    }

    const payload = (await response.json()) as MapboxResponse;
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

function toLimit(value: number | undefined): number {
  return Math.min(10, Math.max(1, value ?? 8));
}
