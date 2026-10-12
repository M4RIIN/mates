import { useEffect, useState } from "react";
import { AppState } from "react-native";

// Refresh time-sensitive lists and badges even when no API response changes.
export function useInvitationClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    // Schedules are minute-aligned: refresh on minute/half-minute boundaries,
    // instead of keeping a mount-relative interval that can lag behind closure.
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      refresh();
      timer = setTimeout(tick, 30_000 - (Date.now() % 30_000));
    };
    timer = setTimeout(tick, 30_000 - (Date.now() % 30_000));
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, []);
  return now;
}
