import { DoctorManagementScreen } from "@/features/doctors";
import { requireApprovedFacility } from "@/server/auth/facilityAccess";

export default async function DoctorManagementPage() {
  const access = await requireApprovedFacility();
  return <DoctorManagementScreen facilityIds={access.facilities.map(facility => facility.facilityId)} />;
}
