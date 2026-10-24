import { type DoctorPersonalAddressInput } from "@startup/contracts";

export const emptyPersonalAddress: DoctorPersonalAddressInput = {
  label: "Home",
  kind: "house",
  building: "",
  street: "",
  locality: "",
  city: "",
  state: "",
  pincode: "",
  latitude: null,
  longitude: null,
  use_account_details: true,
};
