import { router, useLocalSearchParams } from "expo-router";
import { BookingStatusScreen } from "../../../screens/booking-status/BookingStatusScreen";
import type { Appointment, AppointmentStatus } from "../../../types/appointment";

type BookingParams = Partial<Record<keyof Appointment, string>> & {
  status?: AppointmentStatus;
};

export default function BookingStatusRoute() {
  const params = useLocalSearchParams<BookingParams>();
  const appointment: Appointment = {
    id: params.id ?? "#APT20260820",
    doctorName: params.doctorName ?? "Dr. Ananya Sharma",
    qualification: params.qualification ?? "MBBS, MD (General Medicine)",
    specialty: params.specialty ?? "General Physician",
    consultationType:
      params.consultationType === "Home Visit" || params.consultationType === "Online"
        ? params.consultationType
        : "Clinic Visit",
    date: params.date ?? "20 Aug 2026",
    time: params.time ?? "05:30 PM",
    hospital: params.hospital ?? "Apollo Hospitals",
    location: params.location ?? "Jayanagar, Bengaluru",
    experience: params.experience ?? "8+ years experience",
    rating: params.rating ?? "4.8 (120+ reviews)",
    fee: params.fee ?? "₹500",
    status: params.status === "approved" ? "approved" : "pending",
  };

  return (
    <BookingStatusScreen
      appointment={appointment}
      status={appointment.status}
      onBackPress={() => router.back()}
    />
  );
}
