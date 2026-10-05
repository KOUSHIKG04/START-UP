import { DoctorManagementScreen } from "@/features/doctors";
import { requireApprovedFacility } from "@/server/auth/facilityAccess";

export default async function DoctorManagementPage() {
  await requireApprovedFacility();
  return <DoctorManagementScreen />;
}
