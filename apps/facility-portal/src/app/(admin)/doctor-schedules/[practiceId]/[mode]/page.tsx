import { notFound } from "next/navigation";
import { FacilityDoctorScheduleScreen } from "@/features/doctors";

export default async function ManageDoctorServiceSchedulePage({
  params,
}: {
  params: Promise<{ practiceId: string; mode: string }>;
}) {
  const { practiceId, mode } = await params;
  if (mode !== "clinic" && mode !== "online" && mode !== "home") notFound();
  return (
    <FacilityDoctorScheduleScreen
      key={`${practiceId}:${mode}`}
      practiceId={practiceId}
      mode={mode}
    />
  );
}
