import type { Appointment } from "@/types/appointment";
import { parseConsultationType } from "@/features/appointments/utils/consultationFlow";

export type AppointmentParams = Partial<
  Record<keyof Appointment, string | string[]>
>;

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function appointmentFromParams(params: AppointmentParams): Appointment {
  return {
    id: first(params.id) ?? "#APT20260820",
    doctorName: first(params.doctorName) ?? "Dr. Ananya Sharma",
    qualification: first(params.qualification) ?? "MBBS, MD (General Medicine)",
    specialty: first(params.specialty) ?? "General Physician",
    consultationType: parseConsultationType(params.consultationType),
    date: first(params.date) ?? "20 Aug 2026",
    time: first(params.time) ?? "05:30 PM",
    hospital: first(params.hospital) ?? "Apollo Hospitals",
    location: first(params.location) ?? "Jayanagar, Bengaluru",
    experience: first(params.experience) ?? "8+ years experience",
    rating: first(params.rating) ?? "4.8 (120+ reviews)",
    fee: first(params.fee) ?? "₹500",
    status: first(params.status) === "approved" ? "approved" : "pending",
  };
}
