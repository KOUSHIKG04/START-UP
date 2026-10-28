import { useLocalSearchParams } from "expo-router";
import { AmbulancePaymentsScreen } from "../../../../features/ambulance/screens/AmbulancePaymentsScreen";

export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AmbulancePaymentsScreen bookingId={id} />;
}
