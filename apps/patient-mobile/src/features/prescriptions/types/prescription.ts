import type { Appointment } from "../../appointments/types/appointment";
import type { PatientScreenProps } from "../../../types/screen";

export type PrescriptionScreenProps = PatientScreenProps & {
  appointment?: Appointment;
  appointmentId?: string;
  onViewMedicines?: () => void;
};

export type PrescriptionMedicine = {
  id: number;
  name: string;
  dose: string;
  schedule: { breakfast: number; lunch: number; dinner: number };
};
