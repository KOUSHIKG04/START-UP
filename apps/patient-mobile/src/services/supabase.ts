import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import {
  createMobileSession,
  createSecureSessionStorage,
  createSupabaseClient,
} from "@startup/data-access";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key
  ? createSupabaseClient(url, key, {
      auth: {
        storage: createSecureSessionStorage(SecureStore),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export const mobileSession = createMobileSession(supabase);

export function useMobileSession() {
  return useSyncExternalStore(mobileSession.subscribe, mobileSession.getSnapshot);
}

if (supabase) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
