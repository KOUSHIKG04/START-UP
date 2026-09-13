import { router, useLocalSearchParams, type Href } from "expo-router";
import {
  DoctorProfileScreen,
  type BookingSelection,
} from "../../../screens/doctor-profile/DoctorProfileScreen";

type DoctorProfileParams = {
  name?: string;
  qualification?: string;
  specialty?: string;
  experience?: string;
  rating?: string;
  fee?: string;
};

export default function DoctorProfileRoute() {
  const params = useLocalSearchParams<DoctorProfileParams>();
  const doctor = {
    name: params.name ?? "Dr. Ananya Sharma",
    qualification: params.qualification ?? "MBBS, MD (General Medicine)",
    specialty: params.specialty ?? "General Physician",
    experience: params.experience ?? "8+ years experience",
    rating: params.rating ?? "4.8 (120+ reviews)",
    fee: params.fee ?? "₹500",
  };

  const handleBookAppointment = (selection: BookingSelection) => {
    router.push({
      pathname: "/booking-status",
      params: {
        id: "#APT20260820",
        doctorName: doctor.name,
        qualification: doctor.qualification,
        specialty: doctor.specialty,
        consultationType: selection.consultationType,
        date: `${selection.date} 2026`,
        time: selection.time,
        hospital: "Apollo Hospitals",
        location: "Jayanagar, Bengaluru",
        experience: doctor.experience,
        rating: doctor.rating,
        fee: doctor.fee,
        status: "pending",
      },
    } as unknown as Href);
  };

  return (
    <DoctorProfileScreen
      doctor={doctor}
      onBookAppointment={handleBookAppointment}
      onBackPress={() => router.back()}
    />
  );
}
