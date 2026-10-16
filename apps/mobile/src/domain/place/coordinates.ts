export type Coordinates = { latitude: number; longitude: number };

export function validCoordinates(value: Coordinates | null | undefined): Coordinates | null {
  if (value == null || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)
    || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180) return null;
  return { latitude: value.latitude, longitude: value.longitude };
}
