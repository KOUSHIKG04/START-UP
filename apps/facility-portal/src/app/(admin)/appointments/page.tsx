import { listClinicAppointments, listMyPractices } from "@startup/data-access";
import type { ClinicAppointment, ClinicPractice } from "@startup/contracts";
import { createClient } from "@/lib/supabase/server";
import { AppointmentsScreen } from "@/features/appointments";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ practice?: string }>;
}) {
  const client = await createClient();
  let practices: ClinicPractice[] = [];
  let appointments: ClinicAppointment[] = [];
  let selectedPracticeId: string | null = null;
  let loadError: string | undefined;

  try {
    practices = await listMyPractices(client);
    const requested = (await searchParams).practice;
    selectedPracticeId =
      (practices.find((item) => item.practice_id === requested) ?? practices[0])
        ?.practice_id ?? null;
    if (selectedPracticeId)
      appointments = await listClinicAppointments(client, selectedPracticeId);
  } catch {
    loadError =
      "Appointments are unavailable. Confirm portal membership and apply the care-access migrations.";
  }
  
  return (
    <AppointmentsScreen appointments={appointments} loadError={loadError} />
  );
}
