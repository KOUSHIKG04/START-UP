import type { ClinicAppointment } from "@startup/contracts";
export type AppointmentsScreenProps = {
  appointments: ClinicAppointment[];
  loadError?: string;
};
