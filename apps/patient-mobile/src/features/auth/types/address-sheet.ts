import type { PatientAddress } from "./address";
export type AddressSheetProps = {
  visible: boolean;
  value: PatientAddress;
  onClose: () => void;
  onConfirm: (address: PatientAddress) => void;
  onReopen: () => void;
};
