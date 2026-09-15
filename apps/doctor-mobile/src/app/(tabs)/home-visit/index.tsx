import { useLocalSearchParams } from "expo-router";
import { HomeVisitScreen } from "../../../screens/home-visit/HomeVisitScreen";
export default function VisitRoute() {
  const params = useLocalSearchParams();
  const visitKey = [params.appointmentId, params.patientId, params.mode].join(
    ":"
  );
  return <HomeVisitScreen key={visitKey} />;
}
