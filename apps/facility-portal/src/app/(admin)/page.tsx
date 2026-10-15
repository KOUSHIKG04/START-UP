import {
  DashboardDoctorRequests,
  AddDoctorAction,
  facilitySchedule,
  type PracticeSession,
} from "@/features/doctors";
import { changePortalAppointment } from "@/features/appointments";
import { DashboardScreen } from "@/features/dashboard";
import {
  listFacilityBedInventory,
  listMyInventoryFacilities,
  listMyFacilityDoctors,
  listMyFacilityDoctorRequests,
  listMyClinicSessions,
  listMyPracticeAppointments,
} from "@startup/data-access";
import type {
  BedInventoryProjection,
  ClinicAppointment,
  FacilityDoctorRosterItem,
  FacilityDoctorRequest,
} from "@startup/contracts";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedFacility } from "@/server/auth/facilityAccess";

export default async function HomePage() {
  const access = await requireApprovedFacility();
  const client = await createClient();
  let inventory: BedInventoryProjection[] = [];
  let appointments: ClinicAppointment[] = [];
  let doctors: FacilityDoctorRosterItem[] = [];
  let sessions: PracticeSession[] = [];
  let loadError: string | undefined;
  let associationRequests: FacilityDoctorRequest[] | undefined;

  try {
    const [facilities, roster, requests] = await Promise.all([
      listMyInventoryFacilities(client),
      listMyFacilityDoctors(client),
      listMyFacilityDoctorRequests(client).catch(() => undefined),
    ]);
    doctors = roster;
    associationRequests = requests;
    if (requests === undefined)
      loadError = "Doctor association requests could not be loaded.";
    if (facilities[0])
      inventory = await listFacilityBedInventory(
        client,
        facilities[0].facilityId
      );
    const [allAppointments, groups] = await Promise.all([
      listMyPracticeAppointments(client),
      Promise.all(
        roster.map(async (doctor) => ({
          practiceId: doctor.practice_id,
          sessions: await listMyClinicSessions(client, doctor.practice_id),
        }))
      ),
    ]);
    appointments = allAppointments;
    sessions = groups.flatMap((group) =>
      group.sessions.map((session) => ({
        practiceId: group.practiceId,
        session,
      }))
    );
  } catch {
    loadError =
      "Dashboard data is unavailable. Check your facility membership and try again.";
  }
  return (
    <DashboardScreen
      doctorAction={<AddDoctorAction />}
      doctorRequests={
        <DashboardDoctorRequests
          key={access.facilities
            .map((facility) => facility.facilityId)
            .sort()
            .join(":")}
          scope={access.facilities
            .map((facility) => facility.facilityId)
            .sort()
            .join(":")}
          initialRequests={associationRequests}
        />
      }
      inventory={inventory}
      appointments={appointments}
      weeklyDoctors={facilitySchedule(doctors, sessions).weekly}
      loadError={loadError}
      acceptAppointment={changePortalAppointment}
    />
  );
}
