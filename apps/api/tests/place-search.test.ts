import { afterEach, describe, expect, it, vi } from "vitest";
import { PhotonPlaceSearchAdapter } from "../src/infrastructure/places/photon-place-search.adapter.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PhotonPlaceSearchAdapter", () => {
  it("maps Photon features to place candidates", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          features: [
            {
              geometry: {
                coordinates: [2.3522, 48.8566]
              },
              properties: {
                osm_type: "N",
                osm_id: 123,
                name: "Cafe Central",
                housenumber: "12",
                street: "Rue du Centre",
                postcode: "75001",
                city: "Paris",
                country: "France"
              }
            }
          ]
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const places = await new PhotonPlaceSearchAdapter("https://photon.test", "fr").search("cafe");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://photon.test/api?q=cafe&limit=8&lang=fr");
    expect(places).toEqual([
      {
        id: "photon-N-123",
        name: "Cafe Central",
        address: "12 Rue du Centre, 75001 Paris, France",
        longitude: 2.3522,
        latitude: 48.8566
      }
    ]);
  });

  it("does not request Photon for an empty query", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(new PhotonPlaceSearchAdapter("https://photon.test").search("   ")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("limits Photon results to the requested country", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          features: [
            {
              geometry: {
                coordinates: [2.3522, 48.8566]
              },
              properties: {
                osm_type: "N",
                osm_id: 123,
                name: "Cafe Central",
                city: "Paris",
                country: "France",
                countrycode: "fr"
              }
            },
            {
              geometry: {
                coordinates: [-73.5673, 45.5017]
              },
              properties: {
                osm_type: "N",
                osm_id: 456,
                name: "Cafe Central",
                city: "Montreal",
                country: "Canada",
                countrycode: "ca"
              }
            }
          ]
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const places = await new PhotonPlaceSearchAdapter("https://photon.test", "fr").search("cafe", {
      countryCode: "FR",
      limit: 6
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://photon.test/api?q=cafe&limit=6&lang=fr&countrycode=fr");
    expect(places).toHaveLength(1);
    expect(places[0]?.address).toBe("Paris, France");
  });
});
