import { create } from "zustand";

export type ClinicMapLocation = {
  latitude: number;
  longitude: number;
  street: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
};

// Map selection is a draft. Existing onboarding APIs persist it on Save Profile.
export const useClinicLocationDraft = create<{
  chosen: ClinicMapLocation | null;
  choose: (chosen: ClinicMapLocation) => void;
  clear: () => void;
}>((set) => ({ chosen: null, choose: chosen => set({ chosen }), clear: () => set({ chosen: null }) }));
