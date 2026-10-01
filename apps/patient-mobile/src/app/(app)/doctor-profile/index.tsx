import { useLocalSearchParams } from "expo-router";
import { DoctorProfileScreen } from "../../../features/doctors/screens/DoctorProfileScreen";

export default function DoctorProfileRoute() {
  const params = useLocalSearchParams<{ practiceId?: string; serviceId?: string; consultationType?: string }>();
  return <DoctorProfileScreen practiceId={params.practiceId ?? ""} serviceId={params.serviceId ?? ""} consultationType={params.consultationType ?? "Clinic Visit"} />;
}
