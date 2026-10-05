import { AddDoctorAction, facilitySchedule, type PracticeSession } from "@/features/doctors";
import { changePortalAppointment } from "@/features/appointments";
import { DashboardScreen } from "@/features/dashboard";
import {
  listFacilityBedInventory,
  listMyInventoryFacilities,
  listMyFacilityDoctors,
  listMyClinicSessions,
  listMyPracticeAppointments,
} from "@startup/data-access";
import type {
  BedInventoryProjection,
  ClinicAppointment,
  FacilityDoctorRosterItem,
} from "@startup/contracts";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedFacility } from "@/server/auth/facilityAccess";

export default async function HomePage() {
  await requireApprovedFacility();
  const client = await createClient();
  let inventory: BedInventoryProjection[] = [];
  let appointments: ClinicAppointment[] = [];
  let doctors: FacilityDoctorRosterItem[] = [];
  let sessions: PracticeSession[] = [];
  let loadError: string | undefined;
  
  try {
    const [facilities, roster] = await Promise.all([
      listMyInventoryFacilities(client),
      listMyFacilityDoctors(client),
    ]);
    doctors = roster;
    if (facilities[0])
      inventory = await listFacilityBedInventory(
        client,
        facilities[0].facilityId
      );
    const [allAppointments, groups] = await Promise.all([
      listMyPracticeAppointments(client),
      Promise.all(roster.map(async doctor => ({ practiceId: doctor.practice_id,
        sessions: await listMyClinicSessions(client, doctor.practice_id) }))),
    ]);
    appointments = allAppointments;
    sessions = groups.flatMap(group => group.sessions.map(session => ({ practiceId: group.practiceId, session })));
  } catch {
    loadError =
      "Dashboard data is unavailable. Check your facility membership and try again.";
  }
  return (
    <DashboardScreen
      doctorAction={<AddDoctorAction />}
      inventory={inventory}
      appointments={appointments}
      weeklyDoctors={facilitySchedule(doctors, sessions).weekly}
      loadError={loadError}
      acceptAppointment={changePortalAppointment}
    />
  );
}
