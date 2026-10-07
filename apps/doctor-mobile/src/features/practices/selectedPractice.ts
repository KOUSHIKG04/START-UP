import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export const selectedPracticeQueryKey = (doctorId: string | undefined) => ["selected-doctor-practice", doctorId] as const;

function storageKey(doctorId: string) {
  return `clinzo-doctor-practice-${doctorId}`;
}

export async function getSelectedPracticeId(doctorId: string): Promise<string | null> {
  const key = storageKey(doctorId);
  if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function setSelectedPracticeId(doctorId: string, practiceId: string) {
  const key = storageKey(doctorId);
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(key, practiceId);
    return;
  }
  await SecureStore.setItemAsync(key, practiceId);
}
