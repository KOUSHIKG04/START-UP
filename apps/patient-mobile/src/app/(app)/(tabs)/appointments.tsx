import { router } from "expo-router";
import { AppointmentsScreen } from "@/features/appointments/screens/AppointmentsScreen";

export default function AppointmentsRoute() {
  return <AppointmentsScreen onBackPress={() => router.navigate("/")} />;
}
