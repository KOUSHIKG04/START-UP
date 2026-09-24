import { useLocalSearchParams } from "expo-router";
import { LiveDoctorProfileScreen } from "../../../features/doctors/screens/LiveDoctorProfileScreen";

export default function DoctorProfileRoute() {
  const params = useLocalSearchParams<{ practiceId?: string; serviceId?: string; consultationType?: string }>();
  return <LiveDoctorProfileScreen practiceId={params.practiceId ?? ""} serviceId={params.serviceId ?? ""} consultationType={params.consultationType ?? "Clinic Visit"} />;
}
