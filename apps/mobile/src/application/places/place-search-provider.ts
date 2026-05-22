import type { Place } from "@/domain/place/place";

export type PlaceSearchOptions = {
  countryCode?: string;
  limit?: number;
};

export interface PlaceSearchProvider {
  search(query: string, options?: PlaceSearchOptions): Promise<Place[]>;
}
