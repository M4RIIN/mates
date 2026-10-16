import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { buildPlaceMapDocument, type PlaceMapProps } from "../../mobile/src/infrastructure/maps/leaflet-document.js";

const paris = { latitude: 48.8566, longitude: 2.3522 };
const lyon = { latitude: 45.764, longitude: 4.8357 };

function render(overrides: Partial<PlaceMapProps> = {}) {
  const html = buildPlaceMapDocument({ title: "Lieu choisi", destination: null, currentPosition: null, ...overrides });
  const map = { fitBounds: vi.fn(), setView: vi.fn(), on: vi.fn(), invalidateSize: vi.fn() };
  const markers: Array<{ point: number[]; title: string }> = [];
  const L = {
    map: () => map,
    tileLayer: () => ({ addTo: vi.fn() }),
    control: { zoom: () => ({ addTo: vi.fn() }) },
    divIcon: vi.fn(),
    marker: (point: number[], options: { title: string }) => {
      markers.push({ point, title: options.title });
      return { addTo: () => ({ bindTooltip: vi.fn() }) };
    }
  };
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (!script) throw new Error("Missing map script");
  runInNewContext(script, { L, window: { L }, document: { createElement: () => ({ textContent: "" }) } });
  return { html, map, markers };
}

describe("rendez-vous map", () => {
  it("keeps a usable map without coordinates and invents no position pin", () => {
    const { map, markers } = render();
    expect(markers).toEqual([]);
    expect(map.setView).toHaveBeenCalledWith([20, 0], 2, { animate: false });
  });

  it("centres on the user before a destination is chosen", () => {
    const { map, markers } = render({ currentPosition: paris });
    expect(markers).toEqual([{ point: [paris.latitude, paris.longitude], title: "Ta position" }]);
    expect(map.fitBounds).not.toHaveBeenCalled();
    expect(map.setView).toHaveBeenCalledWith([paris.latitude, paris.longitude], 15, { animate: false });
  });

  it("still shows a chosen venue when location is denied or unavailable", () => {
    const { markers } = render({ destination: lyon });
    expect(markers).toEqual([{ point: [lyon.latitude, lyon.longitude], title: "Lieu choisi" }]);
  });

  it.each([paris, lyon])("fits both nearby/coincident and distant pins with marker padding and a zoom cap", (destination) => {
    const { map, markers } = render({ destination, currentPosition: paris });
    expect(markers).toHaveLength(2);
    const [bounds, options] = map.fitBounds.mock.calls[0]!;
    expect(bounds[0]).toEqual([destination.latitude, destination.longitude]);
    expect(bounds[1][0]).toBe(paris.latitude);
    expect(bounds[1][1]).toBeCloseTo(paris.longitude);
    expect(options.maxZoom).toBe(16);
    expect(options.paddingTopLeft[1]).toBeGreaterThanOrEqual(30);
    expect(options.paddingBottomRight[0]).toBeGreaterThanOrEqual(24);
  });

  it("uses adjacent world copies across the date line instead of zooming out around the world", () => {
    const { map } = render({ destination: { latitude: 0, longitude: 179.9 }, currentPosition: { latitude: 0, longitude: -179.9 } });
    const [bounds] = map.fitBounds.mock.calls[0]!;
    expect(Math.abs(bounds[0][1] - bounds[1][1])).toBeCloseTo(0.2);
  });

  it("ignores invalid coordinates but accepts zero latitude and longitude", () => {
    const { markers } = render({ destination: { latitude: NaN, longitude: 2 }, currentPosition: { latitude: 0, longitude: 0 } });
    expect(markers).toEqual([{ point: [0, 0], title: "Ta position" }]);
    expect(render({ destination: { latitude: 91, longitude: 181 } }).markers).toEqual([]);
  });

  it("renders arbitrary venue names as text without breaking out of the embedded document", () => {
    const title = '</script><img src=x onerror="alert(1)"> O\'Reilly';
    const { html, markers } = render({ destination: paris, title });
    expect(markers[0]?.title).toBe(title);
    expect(html).not.toContain(title);
    expect(html.match(/<\/script>/g)).toHaveLength(2);
  });
});
