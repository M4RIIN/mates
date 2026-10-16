import type { PlaceCandidateDto } from "@mates/shared";
export type PlaceCandidate = PlaceCandidateDto;

export type PlaceSearchOptions = {
  countryCode?: string;
  limit?: number;
};

export interface PlaceSearchPort {
  search(query: string, options?: PlaceSearchOptions): Promise<PlaceCandidate[]>;
}
