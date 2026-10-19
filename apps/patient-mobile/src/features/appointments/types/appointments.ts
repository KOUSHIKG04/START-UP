import type { Appointment } from "./appointment";
import type { PatientScreenProps } from "../../../types/screen";

export type BookingFilter =
  "All" | "Clinic Visit" | "Home Visit" | "Online" | "Medicine and test";

export type AppointmentsScreenProps = PatientScreenProps;

export type AppointmentDetailsCardProps = {
  appointment: Appointment;
  defaultOpen?: boolean;
};
