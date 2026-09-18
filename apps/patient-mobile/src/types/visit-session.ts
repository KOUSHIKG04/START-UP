import type { Appointment, VisitSessionMode } from "./appointment";
import type { PatientScreenProps } from "./screen";

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
