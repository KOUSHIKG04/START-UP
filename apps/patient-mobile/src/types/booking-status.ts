import type {
  Appointment,
  AppointmentStatus,
  VisitSessionMode,
} from "./appointment";
import type { PatientScreenProps } from "./screen";

export type BookingStatusScreenProps = PatientScreenProps & {
  appointment: Appointment;
  status: AppointmentStatus;
  onContinue: (mode: VisitSessionMode) => void;
};
