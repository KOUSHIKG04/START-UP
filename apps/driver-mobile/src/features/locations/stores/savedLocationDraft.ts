import type { LocationDraftState } from "../types/saved-location-draft";

export type {
  ChosenMapLocation,
  LocationDraftState,
} from "../types/saved-location-draft";

import { create } from "zustand";

// Temporary navigation state only. An address is persisted by Save Address.
export const useLocationDraft = create<LocationDraftState>((set) => ({
  chosen: null,
  choose: (chosen) => set({ chosen }),
  clear: () => set({ chosen: null }),
}));
