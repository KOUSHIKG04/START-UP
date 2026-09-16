import { doctors } from "@/features/doctors/data/mockDoctors";
import { Redirect, router, useLocalSearchParams, type Href } from "expo-router";
import {
  DoctorProfileScreen,
  type BookingSelection,
} from "@/features/doctors/screens/DoctorProfileScreen";
import { parseConsultationType } from "@/features/appointments/utils/consultationFlow";

type DoctorProfileParams = {
  id: string;
  consultationType?: string | string[];
};

export default function DoctorProfileRoute() {
  const params = useLocalSearchParams<DoctorProfileParams>();
  const doctor = doctors.find((item) => item.id === params.id);
  if (!doctor) return <Redirect href="/doctor/search" />;
  const consultationType = parseConsultationType(params.consultationType);

  const handleBookAppointment = (selection: BookingSelection) => {
    router.push({
      pathname: "/booking/[id]",
      params: {
        id: "#APT20260820",
        doctorName: doctor.name,
        qualification: doctor.qualification,
        specialty: doctor.specialty,
        consultationType: selection.consultationType,
        date: `${selection.date} 2026`,
        time: selection.time,
        hospital: "Apollo Hospitals",
        location:
          selection.address ??
          (selection.consultationType === "Online"
            ? "Secure video consultation"
            : "Jayanagar, Bengaluru"),
        experience: doctor.experience,
        rating: doctor.rating,
        fee: doctor.fee,
        status: "pending",
      },
    } satisfies Href);
  };

  return (
    <DoctorProfileScreen
      doctor={doctor}
      consultationType={consultationType}
      onBookAppointment={handleBookAppointment}
      onBackPress={() => router.back()}
    />
  );
}
