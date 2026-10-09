import { useEffect, useState } from "react";
import { AppState } from "react-native";

// Refresh time-sensitive lists and badges even when no API response changes.
export function useInvitationClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  return now;
}
