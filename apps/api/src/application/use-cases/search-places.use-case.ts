import type { PlaceCandidate, PlaceSearchOptions, PlaceSearchPort } from "../ports/place-search-port.js";
import { mergePlaceResults } from "@mates/shared";
import type { EstablishmentRepository } from "../ports/establishment-repository.js";

export class SearchPlacesUseCase {
  constructor(private readonly placeSearch: PlaceSearchPort, private readonly establishments?: EstablishmentRepository) {}

  async execute(query: string, options?: PlaceSearchOptions): Promise<PlaceCandidate[]> {
    if (this.establishments === undefined) return this.placeSearch.search(query, options);
    const [provider, catalog] = await Promise.allSettled([
      this.placeSearch.search(query, options), query.trim().length >= 3 ? this.establishments.searchListed(query, options?.limit ?? 8) : Promise.resolve([])
    ]);
    if (provider.status === "rejected" && (catalog.status === "rejected" || catalog.value.length === 0)) throw provider.reason;
    return mergePlaceResults(provider.status === "fulfilled" ? provider.value : [], catalog.status === "fulfilled" ? catalog.value : [], query, options?.limit ?? 8);
  }

  async catalog(query: string, limit: number): Promise<PlaceCandidate[]> {
    try { return await this.establishments?.searchListed(query, limit) ?? []; }
    catch { return []; }
  }

  async featured(latitude: number, longitude: number): Promise<PlaceCandidate[]> {
    try { return await this.establishments?.findFeatured(latitude, longitude) ?? []; }
    catch { return []; } // Optional discovery must never prevent an invitation.
  }
}
