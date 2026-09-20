import { router, useLocalSearchParams } from "expo-router";
import { FindDoctorScreen } from "../../../features/doctors/screens/FindDoctorScreen";
import { parseConsultationType } from "../../../features/appointments/utils/consultationFlow";

export default function FindDoctorRoute() {
  const { consultationType } = useLocalSearchParams<{
    consultationType?: string | string[];
  }>();

  return (
    <FindDoctorScreen
      consultationType={parseConsultationType(consultationType)}
      onBackPress={() => router.back()}
    />
  );
}
