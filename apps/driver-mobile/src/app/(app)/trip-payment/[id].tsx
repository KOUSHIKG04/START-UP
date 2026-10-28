import { useLocalSearchParams } from "expo-router";
import { TripPaymentScreen } from "../../../features/trips/screens/TripPaymentScreen";

export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TripPaymentScreen bookingId={id} />;
}
