import type { Appointment } from "./appointment";
export type AppointmentParams = Partial<
  Record<keyof Appointment, string | string[]>
>;
