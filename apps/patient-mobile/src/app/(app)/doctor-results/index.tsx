import { router, useLocalSearchParams } from "expo-router";
import { LiveDoctorResultsScreen } from "../../../features/doctors/screens/LiveDoctorResultsScreen";
import { parseConsultationType } from "../../../features/appointments/utils/consultationFlow";

export default function DoctorResultsRoute() {
  const { symptom, consultationType } = useLocalSearchParams<{
    symptom?: string | string[];
    consultationType?: string | string[];
  }>();
  const selectedSymptom = Array.isArray(symptom) ? symptom[0] : symptom;

  return (
    <LiveDoctorResultsScreen
      symptom={selectedSymptom ?? "your symptoms"}
      consultationType={parseConsultationType(consultationType)}
      onBackPress={() => router.back()}
    />
  );
}
