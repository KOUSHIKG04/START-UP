import { type DoctorPersonalAddressInput } from "@startup/contracts";

export type PersonalAddressFieldProps = {
  value: DoctorPersonalAddressInput;
  onChange: (value: DoctorPersonalAddressInput) => void;
  clinicAddress?: DoctorPersonalAddressInput;
};
