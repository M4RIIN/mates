import type { PlaceCandidate } from "./place-search-port.js";

export interface EstablishmentRepository {
  searchListed(query: string, limit: number): Promise<PlaceCandidate[]>;
  findFeatured(latitude: number, longitude: number): Promise<PlaceCandidate[]>;
}
