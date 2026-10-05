import { DoctorSchedulesScreen, type PracticeSession } from "@/features/doctors";
import { requireApprovedFacility } from "@/server/auth/facilityAccess";
import { createClient } from "@/lib/supabase/server";
import { listMyFacilityDoctors, listMyClinicSessions } from "@startup/data-access";
import type { FacilityDoctorRosterItem } from "@startup/contracts";

export default async function DoctorSchedulesPage() {
  await requireApprovedFacility();
  const client = await createClient();
  let doctors: FacilityDoctorRosterItem[] = [];
  let sessions: PracticeSession[] = [];
  let loadError: string | undefined;
  try {
    doctors = await listMyFacilityDoctors(client);
    const groups = await Promise.all(doctors.map(async doctor => ({
      practiceId: doctor.practice_id,
      sessions: await listMyClinicSessions(client, doctor.practice_id),
    })));
    sessions = groups.flatMap(group => group.sessions.map(session => ({ practiceId: group.practiceId, session })));
  } catch {
    loadError = "Doctor schedules are unavailable. Please refresh and try again.";
  }
  return <DoctorSchedulesScreen doctors={doctors} sessions={sessions} loadError={loadError} />;
}
