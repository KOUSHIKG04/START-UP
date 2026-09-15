import { useLocalSearchParams } from "expo-router";
import { OnlineConsultationScreen } from "../../../screens/online-consultation/OnlineConsultationScreen";
export default function VisitRoute() {
  const params = useLocalSearchParams();
  const visitKey = [params.appointmentId, params.patientId, params.mode].join(
    ":"
  );
  return <OnlineConsultationScreen key={visitKey} />;
}
