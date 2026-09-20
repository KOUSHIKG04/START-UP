import type { Appointment } from "../../appointments/types/appointment";
import type { PatientScreenProps } from "../../../types/screen";

export type PrescriptionScreenProps = PatientScreenProps & {
  appointment: Appointment;
  onViewMedicines: () => void;
};
