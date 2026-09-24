import { listClinicAppointments, listMyClinicSessions, listMyPractices } from "@startup/data-access";
import type { ClinicAppointment, ClinicPractice, ClinicSession } from "@startup/contracts";
import { createClient } from "@/lib/supabase/server";
import { LiveAppointmentsScreen } from "@/features/appointments/screens/LiveAppointmentsScreen";

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ practice?: string }> }) {
  const client = await createClient();
  let practices: ClinicPractice[] = [];
  let appointments: ClinicAppointment[] = [];
  let sessions: ClinicSession[] = [];
  let selectedPracticeId: string | null = null;
  let loadError: string | undefined;
  try {
    practices = await listMyPractices(client);
    const requested = (await searchParams).practice;
    selectedPracticeId = (practices.find((item) => item.practice_id === requested) ?? practices[0])?.practice_id ?? null;
    if (selectedPracticeId) [appointments, sessions] = await Promise.all([
      listClinicAppointments(client, selectedPracticeId), listMyClinicSessions(client, selectedPracticeId),
    ]);
  } catch {
    loadError = "Appointments are unavailable. Confirm portal membership and apply the care-access migrations.";
  }
  return <LiveAppointmentsScreen practices={practices} appointments={appointments} sessions={sessions} selectedPracticeId={selectedPracticeId} loadError={loadError} />;
}
