import { Alert, Linking } from "react-native";

type PlaceLinkInput = {
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export async function openUber(place: PlaceLinkInput): Promise<void> {
  const latitude = place.latitude;
  const longitude = place.longitude;
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    Alert.alert("Uber indisponible", "Ce lieu n'a pas de coordonnees precises.");
    return;
  }

  const params = new URLSearchParams({
    action: "setPickup",
    "dropoff[latitude]": String(latitude),
    "dropoff[longitude]": String(longitude),
    "dropoff[nickname]": place.name
  });
  const appUrl = `uber://?${params.toString()}`;
  const webUrl = `https://m.uber.com/ul/?${params.toString()}`;

  await openPreferredUrl(appUrl, webUrl);
}

export function openDirectionsChooser(place: PlaceLinkInput): void {
  const options = [
    {
      label: "Plans",
      action: () => openAppleMaps(place)
    },
    {
      label: "Google Maps",
      action: () => openGoogleMaps(place)
    },
    {
      label: "Waze",
      action: () => openWaze(place)
    }
  ];

  Alert.alert("Itineraire", "Choisis ton application.", [
    ...options.map((option) => ({
      text: option.label,
      onPress: () => {
        option.action().catch(() => {
          Alert.alert("Ouverture impossible", "Impossible d'ouvrir cette application.");
        });
      }
    })),
    { text: "Annuler", style: "cancel" }
  ]);
}

export async function openTheFork(place: PlaceLinkInput): Promise<void> {
  const city = extractCity(place.address);
  const query = [place.name, city, "the fork"].filter(isPresent).join(" ");
  const url = `https://www.google.com/search?q=${encodeURIComponent(query.length > 0 ? query : `${place.name} the fork`)}`;
  await Linking.openURL(url);
}

export function buildStaticMapUrl(place: PlaceLinkInput): string | null {
  const latitude = place.latitude;
  const longitude = place.longitude;
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return null;
  }

  const marker = `${latitude},${longitude},red-pushpin`;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=900x420&markers=${encodeURIComponent(
    marker
  )}`;
}

async function openAppleMaps(place: PlaceLinkInput): Promise<void> {
  const destination = toDestination(place);
  await Linking.openURL(`http://maps.apple.com/?daddr=${destination}&dirflg=d`);
}

async function openGoogleMaps(place: PlaceLinkInput): Promise<void> {
  const destination = toDestination(place);
  const appUrl = `comgooglemaps://?daddr=${destination}&directionsmode=driving`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

  await openPreferredUrl(appUrl, webUrl);
}

async function openWaze(place: PlaceLinkInput): Promise<void> {
  const latitude = place.latitude;
  const longitude = place.longitude;
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    const query = encodeURIComponent([place.name, place.address].filter(isPresent).join(" "));
    await Linking.openURL(`https://www.waze.com/ul?q=${query}&navigate=yes`);
    return;
  }

  const ll = `${latitude},${longitude}`;
  const appUrl = `waze://?ll=${ll}&navigate=yes`;
  const webUrl = `https://www.waze.com/ul?ll=${ll}&navigate=yes`;

  await openPreferredUrl(appUrl, webUrl);
}

async function openPreferredUrl(appUrl: string, fallbackUrl: string): Promise<void> {
  const canOpenApp = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpenApp ? appUrl : fallbackUrl);
}

function toDestination(place: PlaceLinkInput): string {
  if (place.latitude !== null && place.latitude !== undefined && place.longitude !== null && place.longitude !== undefined) {
    return `${place.latitude},${place.longitude}`;
  }

  const textDestination = [place.name, place.address].filter(isPresent).join(" ");
  return encodeURIComponent(textDestination);
}

function isPresent(value: string | null | undefined): value is string {
  return value !== undefined && value !== null && value.trim().length > 0;
}

function extractCity(address: string | null | undefined): string | null {
  if (!isPresent(address)) {
    return null;
  }

  const segments = address
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    return null;
  }

  const citySegment = segments.length >= 2 ? segments.at(-2) : segments.at(-1);
  if (citySegment === undefined) {
    return null;
  }

  const withoutPostalCode = citySegment.replace(/\b\d{4,6}\b/g, " ").replace(/\s+/g, " ").trim();
  return withoutPostalCode.length > 0 ? withoutPostalCode : citySegment;
}
