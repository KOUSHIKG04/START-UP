import type { ClinicMapLocation } from "../types/clinic-location-draft";

export type { ClinicMapLocation } from "../types/clinic-location-draft";

import { create } from "zustand";

// Map selection is a draft. Existing onboarding APIs persist it on Save Profile.
export const useClinicLocationDraft = create<{
  chosen: ClinicMapLocation | null;
  choose: (chosen: ClinicMapLocation) => void;
  clear: () => void;
}>((set) => ({
  chosen: null,
  choose: (chosen) => set({ chosen }),
  clear: () => set({ chosen: null }),
}));
