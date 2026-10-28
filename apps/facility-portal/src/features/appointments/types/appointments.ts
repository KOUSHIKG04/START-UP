import type { ClinicAppointment } from "@startup/contracts";

export type AppointmentAction =
  | "approve"
  | "reject"
  | "check_in"
  | "call"
  | "hold"
  | "resume"
  | "no_show"
  | "cancel";

export type AppointmentReasonRequest = {
  item: ClinicAppointment;
  action: "hold" | "reject";
};

export interface AppointmentRecord {
  id: string;
  queueNo: string;
  patientId: string;
  patientName: string;
  patientAvatar: string;
  doctorName: string;
  department: string;
  time: string;
  mode: "In-Person" | "Video Call";
  status: "Pending" | "Confirmed" | "Rejected" | "Cancelled";
  period?: AppointmentPeriod;
}

export type AppointmentPeriod = "All" | "Today" | "Tomorrow" | "This Week";
