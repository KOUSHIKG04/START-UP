import { router, useLocalSearchParams } from "expo-router";
import { DoctorResultsScreen } from "@/features/doctors/screens/DoctorResultsScreen";
import { parseConsultationType } from "@/features/appointments/utils/consultationFlow";

export default function DoctorResultsRoute() {
  const { symptom, consultationType } = useLocalSearchParams<{
    symptom?: string | string[];
    consultationType?: string | string[];
  }>();
  const selectedSymptom = Array.isArray(symptom) ? symptom[0] : symptom;

  return (
    <DoctorResultsScreen
      symptom={selectedSymptom ?? "your symptoms"}
      consultationType={parseConsultationType(consultationType)}
      onBackPress={() => router.back()}
    />
  );
}
