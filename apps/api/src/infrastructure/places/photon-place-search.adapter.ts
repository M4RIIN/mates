import type { PlaceCandidate, PlaceSearchOptions, PlaceSearchPort } from "../../application/ports/place-search-port.js";

type PhotonFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
};

type PhotonSearchResponse = {
  features?: PhotonFeature[];
};

export class PhotonPlaceSearchAdapter implements PlaceSearchPort {
  constructor(
    private readonly baseUrl = "https://photon.komoot.io",
    private readonly language = "fr"
  ) {}

  async search(query: string, options: PlaceSearchOptions = {}): Promise<PlaceCandidate[]> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      return [];
    }

    const countryCode = normalizeCountryCode(options.countryCode);
    const url = new URL("/api", this.baseUrl);
    url.searchParams.set("q", trimmedQuery);
    url.searchParams.set("limit", String(toLimit(options.limit)));
    url.searchParams.set("lang", this.language);
    if (countryCode !== undefined) {
      url.searchParams.set("countrycode", countryCode.toLowerCase());
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mates/0.1 (+https://github.com)"
      }
    });
    if (!response.ok) {
      throw new Error(`Photon search failed with status ${response.status}`);
    }

    const payload = (await response.json()) as PhotonSearchResponse;
    return (payload.features ?? [])
      .filter((feature) => isFeatureInCountry(feature, countryCode))
      .map((feature, index) => {
        const coordinates = feature.geometry?.coordinates;
        const properties = feature.properties;

        return {
          id: toPlaceId(properties, index),
          name: truncate(properties?.name ?? toFallbackName(properties), 160),
          address: toNullableTruncatedValue(toAddress(properties), 240),
          longitude: coordinates?.[0] ?? null,
          latitude: coordinates?.[1] ?? null
        };
      });
  }
}

function normalizeCountryCode(value: string | undefined): string | undefined {
  if (value === undefined || !/^[a-z]{2}$/i.test(value)) {
    return undefined;
  }

  return value.toUpperCase();
}

function toLimit(value: number | undefined): number {
  return Math.min(10, Math.max(1, value ?? 8));
}

function isFeatureInCountry(feature: PhotonFeature, countryCode: string | undefined): boolean {
  if (countryCode === undefined) {
    return true;
  }

  const featureCountryCode = normalizeCountryCode(feature.properties?.countrycode);
  if (featureCountryCode !== undefined) {
    return featureCountryCode === countryCode;
  }

  const expectedCountryName = COUNTRY_NAMES_BY_CODE[countryCode];
  return expectedCountryName !== undefined && feature.properties?.country?.trim().toLowerCase() === expectedCountryName;
}

const COUNTRY_NAMES_BY_CODE: Record<string, string> = {
  BE: "belgium",
  CA: "canada",
  CH: "switzerland",
  DE: "germany",
  ES: "spain",
  FR: "france",
  GB: "united kingdom",
  IT: "italy",
  NL: "netherlands",
  PT: "portugal",
  US: "united states"
};

function toPlaceId(properties: PhotonFeature["properties"], index: number): string {
  if (properties?.osm_type !== undefined && properties.osm_id !== undefined) {
    return `photon-${properties.osm_type}-${properties.osm_id}`;
  }

  return `photon-result-${index}`;
}

function toFallbackName(properties: PhotonFeature["properties"]): string {
  return properties?.street ?? properties?.city ?? properties?.district ?? properties?.state ?? "Lieu sans nom";
}

function toAddress(properties: PhotonFeature["properties"]): string | null {
  if (properties === undefined) {
    return null;
  }

  const streetLine = [properties.housenumber, properties.street].filter(isPresent).join(" ");
  const cityLine = [properties.postcode, properties.city ?? properties.district].filter(isPresent).join(" ");
  const addressParts = [streetLine, cityLine, properties.county, properties.state, properties.country].filter(isPresent);

  return addressParts.length > 0 ? addressParts.join(", ") : null;
}

function isPresent(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

function toNullableTruncatedValue(value: string | null, maxLength: number): string | null {
  return value !== null ? truncate(value, maxLength) : null;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
