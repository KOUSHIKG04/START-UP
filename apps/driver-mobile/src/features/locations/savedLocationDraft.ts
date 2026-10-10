import { create } from "zustand";

export type ChosenMapLocation = {
  latitude: number;
  longitude: number;
  street: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  addressId: string | null;
};

type LocationDraftState = {
  chosen: ChosenMapLocation | null;
  choose: (location: ChosenMapLocation) => void;
  clear: () => void;
};

// Temporary navigation state only. An address is persisted by Save Address.
export const useLocationDraft = create<LocationDraftState>((set) => ({
  chosen: null,
  choose: (chosen) => set({ chosen }),
  clear: () => set({ chosen: null }),
}));
