import { FacilityDoctorScheduleScreen } from "@/features/doctors";
export default async function ManageDoctorSchedulePage({
  params,
}: {
  params: Promise<{ practiceId: string }>;
}) {
  const { practiceId } = await params;
  return (
    <FacilityDoctorScheduleScreen
      key={practiceId}
      practiceId={practiceId}
    />
  );
}
