import { useMemo } from "react";
import { buildPlaceMapDocument, type PlaceMapProps } from "@/infrastructure/maps/leaflet-document";

export function PlaceMap({ destination, currentPosition, title }: PlaceMapProps) {
  const html = useMemo(() => buildPlaceMapDocument({ destination, currentPosition, title }),
    [destination?.latitude, destination?.longitude, currentPosition?.latitude, currentPosition?.longitude, title]);
  return <iframe title="Carte du rendez-vous" srcDoc={html} sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    referrerPolicy="origin" style={{ width: "100%", height: "100%", border: 0, display: "block" }} />;
}
