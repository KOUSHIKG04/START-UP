import type { Appointment } from "./appointment";
import type { PatientScreenProps } from "./screen";

export type PrescriptionScreenProps = PatientScreenProps & {
  appointment: Appointment;
  onViewMedicines: () => void;
};
