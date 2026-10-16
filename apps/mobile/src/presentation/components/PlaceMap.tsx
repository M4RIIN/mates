import { useMemo } from "react";
import { WebView } from "react-native-webview";
import { buildPlaceMapDocument, type PlaceMapProps } from "@/infrastructure/maps/leaflet-document";

export function PlaceMap({ destination, currentPosition, title }: PlaceMapProps) {
  const html = useMemo(() => buildPlaceMapDocument({ destination, currentPosition, title }),
    [destination?.latitude, destination?.longitude, currentPosition?.latitude, currentPosition?.longitude, title]);
  return <WebView originWhitelist={["*"]} scrollEnabled={false} source={{ html }} applicationNameForUserAgent="Mates"
    accessibilityLabel="Carte du rendez-vous" style={{ flex: 1, backgroundColor: "#DCE7FF" }} />;
}
