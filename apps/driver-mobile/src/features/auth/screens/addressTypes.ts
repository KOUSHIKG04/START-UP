export type PatientAddress = {
  building: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
};

export const emptyAddress: PatientAddress = {
  building: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
};
