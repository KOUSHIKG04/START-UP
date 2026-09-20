import type {
  AppointmentRecord,
  AppointmentPeriod,
} from "../types/appointments";

// Demo rows and summary totals are independent placeholders, not backend results.
export const appointmentsData: AppointmentRecord[] = [
  {
    id: "1",
    queueNo: "—",
    patientId: "PT-0482",
    patientName: "Anush Raghavan",
    patientAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
    doctorName: "Dr. Priya Sharma",
    department: "Cardiology",
    time: "11:30 AM - 12:00 PM",
    mode: "In-Person",
    status: "Pending",
  },
  {
    id: "2",
    queueNo: "1",
    patientId: "PT-1290",
    patientName: "Sarah Jenkins",
    patientAvatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120",
    doctorName: "Dr. Suresh Babu",
    department: "General Medicine",
    time: "01:15 PM - 01:45 PM",
    mode: "Video Call",
    status: "Confirmed",
  },
  {
    id: "3",
    queueNo: "2",
    patientId: "PT-0911",
    patientName: "Nandan Hegde",
    patientAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
    doctorName: "Dr. Arjun Mehta",
    department: "Pediatrics",
    time: "02:30 PM - 03:00 PM",
    mode: "In-Person",
    status: "Confirmed",
  },
  {
    id: "4",
    queueNo: "—",
    patientId: "PT-1422",
    patientName: "Vikram Malhotra",
    patientAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120",
    doctorName: "Dr. Rajesh Kumar",
    department: "Neurology",
    time: "04:00 PM - 04:30 PM",
    mode: "In-Person",
    status: "Rejected",
  },
  {
    id: "5",
    queueNo: "—",
    patientId: "PT-2051",
    patientName: "Aria D'Souza",
    patientAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
    doctorName: "Dr. Karthik Raman",
    department: "Orthopedics",
    time: "09:30 AM - 10:00 AM",
    mode: "Video Call",
    status: "Pending",
  },
  {
    id: "6",
    queueNo: "—",
    patientId: "PT-1033",
    patientName: "Kunal Sen",
    patientAvatar:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120",
    doctorName: "Dr. Priya Sharma",
    department: "Cardiology",
    time: "04:00 PM - 04:30 PM",
    mode: "In-Person",
    status: "Cancelled",
  },
  {
    id: "7",
    queueNo: "3",
    patientId: "PT-3104",
    patientName: "Meera Nair",
    patientAvatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120",
    doctorName: "Dr. Suresh Babu",
    department: "General Medicine",
    time: "11:30 AM - 12:00 PM",
    mode: "In-Person",
    status: "Confirmed",
  },
  {
    id: "8",
    queueNo: "4",
    patientId: "PT-0816",
    patientName: "Zayn Malik",
    patientAvatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120",
    doctorName: "Dr. Arjun Mehta",
    department: "Pediatrics",
    time: "03:15 PM",
    mode: "Video Call",
    status: "Confirmed",
  },
];

export const appointmentPeriods = [
  "All",
  "Today",
  "Tomorrow",
  "This Week",
] as const satisfies readonly AppointmentPeriod[];
export const defaultAppointmentPeriod: AppointmentPeriod = "Today";
export const appointmentsSummary = {
  total: 48,
  confirmed: 32,
  pending: 12,
  cancelled: 4,
} as const;
export const appointmentsDateLabel = "Nov 15, 2026";
export const bookingDateLabel = "Today, Nov 15, 2024";
export const appointmentsPagination = {
  range: "1-8",
  total: 156,
  currentPage: 1,
  nextPages: [2, 3],
  lastPage: 20,
} as const;
