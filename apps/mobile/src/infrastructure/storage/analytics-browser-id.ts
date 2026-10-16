import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const storageKey = "mates:analytics-browser-id";
let pending: Promise<string | undefined> | undefined;

// Optional analytics identity: storage failure must not prevent a public RSVP.
// The per-invitation guest key remains the only proof used to retrieve a response.
export function getAnalyticsBrowserId(): Promise<string | undefined> {
  if (pending !== undefined) return pending;
  pending = (async () => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored !== null && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(stored)) return stored;
      const id = Crypto.randomUUID();
      await AsyncStorage.setItem(storageKey, id);
      return id;
    } catch { return undefined; }
  })().finally(() => { pending = undefined; });
  return pending;
}
