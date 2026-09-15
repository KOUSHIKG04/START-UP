import { useLocalSearchParams } from "expo-router";
import { ChatScreen } from "../../../screens/chat/ChatScreen";
export default function VisitRoute() {
  const params = useLocalSearchParams();
  const visitKey = [params.appointmentId, params.patientId, params.mode].join(
    ":"
  );
  return <ChatScreen key={visitKey} />;
}
