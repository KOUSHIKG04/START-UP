import { router, useLocalSearchParams } from "expo-router";
import { DoctorSearchScreen } from "@/features/doctors/screens/DoctorSearchScreen";
import { parseConsultationType } from "@/features/appointments/utils/consultationFlow";

export default function FindDoctorRoute() {
  const { consultationType } = useLocalSearchParams<{
    consultationType?: string | string[];
  }>();

  return (
    <DoctorSearchScreen
      consultationType={parseConsultationType(consultationType)}
      onBackPress={() => router.back()}
    />
  );
}
