import type { AppointmentPeriod } from "../types/appointments";
import { formatDisplayDate } from "@startup/contracts";

export const appointmentPeriods = [
  "All",
  "Today",
  "Tomorrow",
  "This Week",
] as const satisfies readonly AppointmentPeriod[];
export const defaultAppointmentPeriod: AppointmentPeriod = "Today";
export const appointmentModeLabels = {
  clinic: "Clinic visits",
  online: "Online consultations",
  home: "Home visits",
} as const;
export const patientGenderOptions = [
  "Male",
  "Female",
  "Other",
  "Prefer not to say",
] as const;
export const appointmentSourceLabels = {
  patient_online: "Patient app",
  reception_walk_in: "Reception walk-in",
  staff_booking: "Staff booking",
  offline_sync: "Offline registration",
} as const;
export const appointmentsDateFormatter = {
  format: (date: Date) => formatDisplayDate(date, "Asia/Kolkata"),
};

export const appointmentStatuses = [
  "All",
  "Pending",
  "Confirmed",
  "Rejected",
  "Cancelled",
  "Completed",
  "No_show",
  "In_consultation",
];
