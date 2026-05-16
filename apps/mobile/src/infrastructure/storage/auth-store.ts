import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CurrentUserDto } from "@mates/shared";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AuthState = {
  token: string | null;
  user: CurrentUserDto | null;
  hasHydrated: boolean;
  setSession: (token: string, user: CurrentUserDto) => void;
  setUser: (user: CurrentUserDto) => void;
  clearSession: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ token: null, user: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated })
    }),
    {
      name: "mates-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
