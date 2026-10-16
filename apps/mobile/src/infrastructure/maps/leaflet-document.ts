import { validCoordinates, type Coordinates } from "../../domain/place/coordinates";

export type PlaceMapProps = {
  destination: Coordinates | null;
  currentPosition: Coordinates | null;
  title: string;
};

// The same document runs in the native WebView and the sandboxed web iframe.
export function buildPlaceMapDocument(props: PlaceMapProps): string {
  const data = JSON.stringify({
    destination: validCoordinates(props.destination),
    currentPosition: validCoordinates(props.currentPosition),
    title: props.title
  }).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
  return `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<!-- OSM needs a Referer; origin-only keeps invitation paths and tokens private. -->
<meta name="referrer" content="origin" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
<style>
html, body, #map { margin:0; padding:0; width:100%; height:100%; background:#dce7ff; }
.leaflet-container { font-family:-apple-system,BlinkMacSystemFont,sans-serif; }
.map-icon { background:none; border:none; }
.place-pin { display:block; width:24px; height:24px; box-sizing:border-box; background:#EF2B2D; border:3px solid white; border-radius:50% 50% 50% 0; transform:rotate(-45deg); box-shadow:0 1px 5px #071a2d66; }
.position-pin { display:block; width:18px; height:18px; box-sizing:border-box; background:#0057FF; border:3px solid white; border-radius:50%; box-shadow:0 0 0 4px #0057ff33; }
.map-error { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:24px; text-align:center; font:14px sans-serif; color:#071A2D; }
</style></head><body>
<div id="map" aria-label="Carte du rendez-vous"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
(() => {
  if (!window.L) {
    document.getElementById('map').textContent = 'Carte indisponible. Vérifie ta connexion puis réessaie.';
    document.getElementById('map').className = 'map-error';
    return;
  }
  const data = ${data};
  const map = L.map('map', { zoomControl:false, scrollWheelZoom:false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
  }).addTo(map);
  L.control.zoom({ position:'topright' }).addTo(map);
  const points = [];
  function marker(position, label, kind) {
    // Choose the nearest world copy when the points straddle the date line.
    let longitude = position.longitude;
    if (points.length) longitude = points[0][1] + ((longitude - points[0][1] + 540) % 360) - 180;
    const point = [position.latitude, longitude];
    points.push(point);
    const isPosition = kind === 'position';
    const icon = L.divIcon({ className:'map-icon', html:'<span class="' + kind + '-pin"></span>',
      iconSize:isPosition ? [18,18] : [24,30], iconAnchor:isPosition ? [9,9] : [12,28] });
    const text = document.createElement('span');
    text.textContent = label;
    L.marker(point, { icon, title:label, alt:label, zIndexOffset:isPosition ? 1000 : 0 }).addTo(map).bindTooltip(text);
  }
  if (data.destination) marker(data.destination, data.title || 'Lieu choisi', 'place');
  if (data.currentPosition) marker(data.currentPosition, 'Ta position', 'position');
  function frame() {
    if (points.length > 1) map.fitBounds(points, {
      paddingTopLeft:[38,44], paddingBottomRight:[38,36], maxZoom:16, animate:false
    });
    else map.setView(points[0] || [20,0], points.length ? 15 : 2, { animate:false });
  }
  frame();
  map.on('resize', frame);
  if (window.ResizeObserver) new ResizeObserver(() => map.invalidateSize({ pan:false })).observe(document.getElementById('map'));
})();
</script></body></html>`;
}
