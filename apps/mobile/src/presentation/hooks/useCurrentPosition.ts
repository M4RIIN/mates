import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { Platform } from "react-native";
import { validCoordinates } from "@/domain/place/coordinates";

export function useCurrentPosition() {
  const query = useQuery({
    queryKey: ["current-position"],
    staleTime: 60_000,
    retry: false,
    networkMode: "always",
    queryFn: async () => {
      if (Platform.OS === "web") {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) { reject(new Error("Localisation indisponible.")); return; }
          navigator.geolocation.getCurrentPosition(resolve, reject, { maximumAge: 60_000, timeout: 15_000 });
        });
        const coordinates = validCoordinates(position.coords);
        if (coordinates === null) throw new Error("Ta position est indisponible pour le moment.");
        return coordinates;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error("Autorise la localisation pour afficher ta position.");
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const position = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Ta position est indisponible pour le moment.")), 15_000); })
        ]);
        const coordinates = validCoordinates(position.coords);
        if (coordinates === null) throw new Error("Ta position est indisponible pour le moment.");
        return coordinates;
      } finally { clearTimeout(timer); }
    }
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    // Refresh on return to Proposer without duplicating the initial GPS request.
    void refetch({ cancelRefetch: false });
  }, [refetch]));
  return query;
}
