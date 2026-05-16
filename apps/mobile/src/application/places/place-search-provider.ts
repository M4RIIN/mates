import type { Place } from "@/domain/place/place";

export interface PlaceSearchProvider {
  search(query: string): Promise<Place[]>;
}
