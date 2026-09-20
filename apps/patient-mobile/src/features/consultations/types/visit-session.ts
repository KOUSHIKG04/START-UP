import type { Appointment, VisitSessionMode } from "../../appointments/types/appointment";
import type { PatientScreenProps } from "../../../types/screen";

export type CompletionActions = {
  onGoHome: () => void;
  onViewMedicines: () => void;
  onViewPrescription: () => void;
};

export type VisitSessionScreenProps = PatientScreenProps & {
  appointment: Appointment;
  mode: VisitSessionMode;
  onGoHome: () => void;
  onViewMedicines: () => void;
  onViewPrescription: () => void;
};
