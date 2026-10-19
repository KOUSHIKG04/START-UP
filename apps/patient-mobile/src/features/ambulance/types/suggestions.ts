import type { AmbulanceHospital } from "@startup/contracts";
export type SuggestionsProps = {
  query?: string;
  onSelect: (hospital: AmbulanceHospital) => void;
  onClose?: () => void;
  hospitals: AmbulanceHospital[];
};
