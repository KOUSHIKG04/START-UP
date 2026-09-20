import { useLocalSearchParams } from "expo-router";
import { PrescriptionScreen } from "../../../../features/prescriptions/screens/PrescriptionScreen";
export default function VisitRoute() {
  const params = useLocalSearchParams();
  const visitKey = [params.appointmentId, params.patientId, params.mode].join(
    ":"
  );
  return <PrescriptionScreen key={visitKey} />;
}
