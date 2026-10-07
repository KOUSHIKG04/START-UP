import { formatDisplayDate, type ClinicAppointment } from "@startup/contracts";
import type { Appointment } from "../types/appointment";

export function clinicAppointmentCard(item: ClinicAppointment): Appointment {
  const start = new Date(item.starts_at);
  return {
    id: item.public_code,
    backendId: item.id,
    doctorName: item.doctor_name,
    qualification: "",
    specialty: item.service_name,
    consultationType: item.visit_mode === "online" ? "Online" : item.visit_mode === "home" ? "Home Visit" : "Clinic Visit",
    date: formatDisplayDate(start),
    time: start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    hospital: item.facility_name,
    location: item.facility_name,
    experience: "",
    rating: "",
    fee: `${item.currency === "INR" ? "₹" : `${item.currency} `}${(Number(item.fee_minor) / 100).toFixed(2)}`,
    status: ["confirmed", "in_consultation", "completed"].includes(item.status) ? "approved" : "pending",
  };
}
