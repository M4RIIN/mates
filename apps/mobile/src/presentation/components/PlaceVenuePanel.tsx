import { useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { CarFront, MapPinned, UtensilsCrossed } from "lucide-react-native";
import { AppButton } from "@/presentation/components/AppButton";
import { useApiClient } from "@/presentation/hooks/useApiClient";
import { openDirectionsChooser, openTheFork, openUber } from "@/presentation/utils/place-links";
import { borders, colors, radii, spacing } from "@/shared/theme";
import { validCoordinates, type Coordinates } from "@/domain/place/coordinates";
import { PlaceMap } from "./PlaceMap";

type PlaceVenuePanelProps = {
  title: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  invitationId?: string;
  showTransportActions?: boolean;
  showReserveButton?: boolean;
  compact?: boolean;
  currentPosition?: Coordinates | null;
  alwaysShowMap?: boolean;
};

export function PlaceVenuePanel({
  title,
  address,
  latitude,
  longitude,
  invitationId,
  showTransportActions = true,
  showReserveButton = false,
  compact = false,
  currentPosition = null,
  alwaysShowMap = false
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
  const destination = latitude != null && longitude != null ? validCoordinates({ latitude, longitude }) : null;
  const position = validCoordinates(currentPosition);
  const hasCoordinates = destination !== null;
  const canRenderInteractiveMap = hasCoordinates || position !== null || alwaysShowMap;

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
          <PlaceMap destination={destination} currentPosition={position} title={title} />
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

      {position !== null || destination !== null ? <View style={styles.legend}>
        {position !== null ? <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Ta position</Text></View> : null}
        {destination !== null ? <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.red }]} /><Text style={styles.legendText}>Lieu choisi</Text></View> : null}
      </View> : null}

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
    height: 260
  },
  mapFrameCompact: {
    height: 230
  },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
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
