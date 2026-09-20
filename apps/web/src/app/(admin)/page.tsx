import { AddDoctorAction } from "@/features/doctors";
import { DashboardScreen } from "@/features/dashboard";

export default function HomePage() {
  return <DashboardScreen doctorAction={<AddDoctorAction />} />;
}
