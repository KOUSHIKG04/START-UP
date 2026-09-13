import { router, useLocalSearchParams } from "expo-router";
import { DoctorResultsScreen } from "../../../screens/doctor-results/DoctorResultsScreen";

export default function DoctorResultsRoute() {
  const { symptom } = useLocalSearchParams<{ symptom?: string | string[] }>();
  const selectedSymptom = Array.isArray(symptom) ? symptom[0] : symptom;

  return (
    <DoctorResultsScreen
      symptom={selectedSymptom ?? "your symptoms"}
      onBackPress={() => router.back()}
    />
  );
}
