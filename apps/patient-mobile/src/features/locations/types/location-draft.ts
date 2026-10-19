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

export type LocationDraftState = {
  chosen: ChosenMapLocation | null;
  choose: (location: ChosenMapLocation) => void;
  clear: () => void;
};
