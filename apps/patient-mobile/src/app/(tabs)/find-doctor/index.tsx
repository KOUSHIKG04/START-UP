import { router } from "expo-router";
import { FindDoctorScreen } from "../../../screens/find-doctor/FindDoctorScreen";

export default function FindDoctorRoute() {
  return <FindDoctorScreen onBackPress={() => router.back()} />;
}
