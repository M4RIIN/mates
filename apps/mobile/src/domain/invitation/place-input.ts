import type { Place } from "../place/place";

export function buildInvitationPlaceInput(place: Place | null, query: string, address: string) {
  const placeAddress = address.trim();
  const sameAddress = place !== null && placeAddress === (place.address ?? "").trim();
  return {
    placeName: place?.name ?? query.trim(),
    ...(placeAddress ? { placeAddress } : {}),
    ...(sameAddress && place.latitude != null ? { latitude: place.latitude } : {}),
    ...(sameAddress && place.longitude != null ? { longitude: place.longitude } : {})
  };
}
