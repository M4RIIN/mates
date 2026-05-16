export type PlaceCandidate = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export interface PlaceSearchPort {
  search(query: string): Promise<PlaceCandidate[]>;
}
