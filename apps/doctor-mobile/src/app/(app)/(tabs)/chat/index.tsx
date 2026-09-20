import { useLocalSearchParams } from "expo-router";
import { ChatScreen } from "../../../../features/consultations/screens/ChatScreen";
export default function VisitRoute() {
  const params = useLocalSearchParams();
  const visitKey = [params.appointmentId, params.patientId, params.mode].join(
    ":"
  );
  return <ChatScreen key={visitKey} />;
}
