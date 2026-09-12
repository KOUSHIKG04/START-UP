import { router } from "expo-router";
import { AppointmentsScreen } from "../../../screens/appointments/AppointmentsScreen";

export default function AppointmentsRoute() {
  return (
    <AppointmentsScreen onBackPress={() => router.navigate("/")} />
  );
}
