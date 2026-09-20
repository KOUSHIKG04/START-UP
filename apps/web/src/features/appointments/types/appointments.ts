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
}

export type AppointmentPeriod = "All" | "Today" | "Tomorrow" | "This Week";
