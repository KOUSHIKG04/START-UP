import { router } from "expo-router";
import { LiveSosScreen } from "../../../features/ambulance/screens/LiveSosScreen";

export default function SosRoute() {
  return (
    <LiveSosScreen onBackPress={() => router.back()} />
  );
}
