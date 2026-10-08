import { router } from "expo-router";
import { LiveSosScreen } from "../../features/ambulance/screens/LiveSosScreen";

export default function OnboardingSosScreen() {
  return <LiveSosScreen onboarding onBackPress={() => router.replace("/setup")} />;
}
