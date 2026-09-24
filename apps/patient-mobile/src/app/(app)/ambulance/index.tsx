import { router } from "expo-router";
import { LiveAmbulanceBookingScreen } from "../../../features/ambulance/screens/LiveAmbulanceBookingScreen";

export default function AmbulanceRoute() {
  return <LiveAmbulanceBookingScreen onBackPress={() => router.back()} />;
}
