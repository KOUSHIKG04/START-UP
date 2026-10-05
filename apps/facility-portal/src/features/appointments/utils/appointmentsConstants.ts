import type { AppointmentPeriod } from "../types/appointments";
import { formatDisplayDate } from "@startup/contracts";

export const appointmentPeriods = [
  "All",
  "Today",
  "Tomorrow",
  "This Week",
] as const satisfies readonly AppointmentPeriod[];
export const defaultAppointmentPeriod: AppointmentPeriod = "Today";
export const appointmentsDateFormatter = { format: (date: Date) => formatDisplayDate(date, "Asia/Kolkata") };
