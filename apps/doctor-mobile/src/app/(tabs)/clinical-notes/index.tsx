import { useLocalSearchParams } from "expo-router";
import { ClinicalNotesScreen } from "../../../screens/clinical-notes/ClinicalNotesScreen";
export default function VisitRoute() {
  const params = useLocalSearchParams();
  const visitKey = [params.appointmentId, params.patientId, params.mode].join(
    ":"
  );
  return <ClinicalNotesScreen key={visitKey} />;
}
