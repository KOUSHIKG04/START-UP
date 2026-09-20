import { useLocalSearchParams } from "expo-router";
import { OnlineConsultationScreen } from "../../../../features/consultations/screens/OnlineConsultationScreen";
export default function VisitRoute() {
  const params = useLocalSearchParams();
  const visitKey = [params.appointmentId, params.patientId, params.mode].join(
    ":"
  );
  return <OnlineConsultationScreen key={visitKey} />;
}
