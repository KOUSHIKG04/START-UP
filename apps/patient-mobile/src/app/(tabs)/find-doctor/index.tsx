import { router, useLocalSearchParams } from "expo-router";
import { FindDoctorScreen } from "../../../screens/find-doctor/FindDoctorScreen";
import { parseConsultationType } from "../../../utils/consultationFlow";

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
