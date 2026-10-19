import type { DriverMapLocation } from "../types/location-draft";
export type { DriverMapLocation } from "../types/location-draft";
import { create } from "zustand";

// Map selection is a draft. Existing onboarding APIs persist it on Save Profile.
export const useDriverLocationDraft = create<{
  chosen: DriverMapLocation | null;
  choose: (chosen: DriverMapLocation) => void;
  clear: () => void;
}>((set) => ({
  chosen: null,
  choose: (chosen) => set({ chosen }),
  clear: () => set({ chosen: null }),
}));
