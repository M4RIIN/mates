import { useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { CarFront, MapPinned, UtensilsCrossed } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { useApiClient } from "@/presentation/hooks/useApiClient";
import { openDirectionsChooser, openTheFork, openUber } from "@/presentation/utils/place-links";
import { borders, colors, radii, spacing } from "@/shared/theme";

type PlaceVenuePanelProps = {
  title: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  invitationId?: string;
  showTransportActions?: boolean;
  showReserveButton?: boolean;
  compact?: boolean;
};

export function PlaceVenuePanel({
  title,
  address,
  latitude,
  longitude,
  invitationId,
  showTransportActions = true,
  showReserveButton = false,
  compact = false
}: PlaceVenuePanelProps) {
  const api = useApiClient();
  const { width } = useWindowDimensions();
  const [isUberOpening, setIsUberOpening] = useState(false);
  const [isReserveOpening, setIsReserveOpening] = useState(false);
  const place = {
    name: title,
    ...(address !== undefined ? { address } : {}),
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {})
  };
  const hasCoordinates = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;
  const canRenderInteractiveMap = hasCoordinates && Platform.OS !== "web";
  const NativeWebView = canRenderInteractiveMap ? require("react-native-webview").WebView : null;

  async function handleUberPress() {
    try {
      setIsUberOpening(true);
      if (invitationId !== undefined) {
        await api.trackInvitationAuditEvent(invitationId, "uber_requested").catch((error: unknown) => {
          console.warn("Failed to track Uber request audit event", error);
        });
      }
      await openUber(place);
    } finally {
      setIsUberOpening(false);
    }
  }

  async function handleReservePress() {
    try {
      setIsReserveOpening(true);
      if (invitationId !== undefined) {
        await api.trackInvitationAuditEvent(invitationId, "reservation_requested").catch((error: unknown) => {
          console.warn("Failed to track reservation audit event", error);
        });
      }
      await openTheFork(place);
    } finally {
      setIsReserveOpening(false);
    }
  }

  return (
    <View style={[styles.panel, compact ? styles.panelCompact : null]}>
      <View style={styles.header}>
        <Text style={styles.label}>Lieu</Text>
        <View style={styles.badge}>
          <MapPinned size={14} color={colors.ink} strokeWidth={3} />
        </View>
      </View>

      {canRenderInteractiveMap ? (
        <View style={[styles.mapFrame, compact ? styles.mapFrameCompact : null]}>
          {NativeWebView !== null ? (
            <NativeWebView
              originWhitelist={["*"]}
              scrollEnabled={false}
              source={{
                html: buildLeafletHtml({
                  latitude: latitude as number,
                  longitude: longitude as number,
                  title
                })
              }}
              style={styles.webview}
            />
          ) : null}

        </View>
      ) : (
        <View style={[styles.mapFallback, compact ? styles.mapFallbackCompact : null]}>
          <View style={styles.fallbackIcon}>
            <MapPinned size={24} color={colors.white} strokeWidth={3} />
          </View>
          <Text style={styles.fallbackText}>
            {hasCoordinates ? showTransportActions ? "Carte indisponible sur ce support. Utilise l’itinéraire pour rejoindre le lieu." : "Carte indisponible sur ce support." : "Carte indisponible pour ce lieu."}
          </Text>
        </View>
      )}

      {address !== null && address !== undefined ? <Text style={styles.address}>{address}</Text> : null}

      {showTransportActions ? (
        <View style={[styles.actions, width <= 360 ? styles.actionsStacked : null]}>
          <View style={styles.actionItem}>
            <AppButton
              title="Uber"
              onPress={() => {
                handleUberPress().catch(() => undefined);
              }}
              loading={isUberOpening}
              disabled={!hasCoordinates}
              variant="secondary"
              icon={<CarFront size={18} color={colors.ink} strokeWidth={3} />}
            />
          </View>
          <View style={styles.actionItem}>
            <AppButton
              title="Itinéraire"
              onPress={() => openDirectionsChooser(place)}
              variant="primary"
              icon={<MapPinned size={18} color={colors.white} strokeWidth={3} />}
            />
          </View>
        </View>
      ) : null}

      {showReserveButton ? (
        <View style={styles.reserveRow}>
          <AppButton
            title="Chercher une réservation"
            onPress={() => {
              handleReservePress().catch(() => undefined);
            }}
            loading={isReserveOpening}
            variant="success"
            icon={<UtensilsCrossed size={18} color={colors.ink} strokeWidth={3} />}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    padding: spacing.md,
    gap: spacing.sm
  },
  panelCompact: {
    padding: spacing.sm,
    gap: spacing.xs
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  label: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center"
  },
  mapFrame: {
    overflow: "hidden",
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.blueSoft,
    minHeight: 220
  },
  mapFrameCompact: {
    minHeight: 186
  },
  webview: {
    flex: 1,
    backgroundColor: colors.blueSoft
  },
  mapFallback: {
    minHeight: 148,
    borderRadius: radii.md,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    gap: spacing.sm
  },
  mapFallbackCompact: {
    minHeight: 128
  },
  fallbackIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: borders.regular,
    borderColor: colors.border,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center"
  },
  fallbackText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center"
  },
  address: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700"
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  actionsStacked: { flexDirection: "column" },
  actionItem: {
    flex: 1
  },
  reserveRow: {
    marginTop: spacing.xxs
  }
});

function buildLeafletHtml({ latitude, longitude, title }: { latitude: number; longitude: number; title: string }): string {
  const escapedTitle = escapeHtml(title);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #dce7ff; }
      .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const map = L.map('map', { zoomControl: false }).setView([${latitude}, ${longitude}], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      L.control.zoom({ position: 'topright' }).addTo(map);
      L.marker([${latitude}, ${longitude}]).addTo(map).bindPopup('${escapedTitle}').openPopup();
    </script>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;");
}
