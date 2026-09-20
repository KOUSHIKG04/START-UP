import { AddDoctorAction } from "@/features/doctors";
import { DashboardScreen } from "@/features/dashboard";

export default function DashboardPage() {
  return <DashboardScreen doctorAction={<AddDoctorAction />} />;
}
