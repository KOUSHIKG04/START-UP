import type { PatientScreenProps } from "../../../types/screen";

export type BookingFilter =
  | "All"
  | "Clinic Visit"
  | "Home Visit"
  | "Online"
  | "Medicine and test";

export type AppointmentsScreenProps = PatientScreenProps;
