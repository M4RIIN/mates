import type { PlaceCandidateDto } from "./index.js";

export function normalizePlaceText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

// A name alone never identifies a venue. Keep homonyms at different addresses.
export function placeIdentityKey(place: Pick<PlaceCandidateDto, "name" | "address" | "latitude" | "longitude">): string | null {
  const name = normalizePlaceText(place.name);
  const address = normalizePlaceText(place.address ?? "");
  if (address) return JSON.stringify([name, address]);
  if (place.latitude !== null && place.longitude !== null) {
    return JSON.stringify([name, place.latitude.toFixed(5), place.longitude.toFixed(5)]);
  }
  return null;
}

export function mergePlaceResults(provider: PlaceCandidateDto[], catalog: PlaceCandidateDto[], query: string, limit = 8): PlaceCandidateDto[] {
  const results: PlaceCandidateDto[] = [];
  for (const candidate of [...provider, ...catalog]) {
    const key = placeIdentityKey(candidate);
    const existing = results.findIndex(place =>
      (candidate.establishmentId !== undefined && candidate.establishmentId === place.establishmentId) ||
      (candidate.reference !== undefined && candidate.reference.provider === place.reference?.provider && candidate.reference.externalId === place.reference.externalId) ||
      (key !== null && key === placeIdentityKey(place))
    );
    if (existing < 0) results.push(candidate);
    else if (candidate.establishmentId !== undefined) {
      // Use the catalog snapshot with its stable identity; retain provider order/reference.
      const previous = results[existing]!;
      results[existing] = { ...candidate, ...(previous.reference !== undefined ? { reference: previous.reference } : {}) };
    }
  }
  const text = normalizePlaceText(query);
  const rank = (place: PlaceCandidateDto) => {
    const name = normalizePlaceText(place.name);
    return name === text ? 0 : name.startsWith(text) ? 1 : name.includes(text) || normalizePlaceText(place.address ?? "").includes(text) ? 2 : 3;
  };
  // Stable sort preserves supplier order and puts manual-only entries after ties.
  return results.sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}
