import { AddDoctorAction } from "@/features/doctors";
import { changePortalAppointment } from "@/features/appointments";
import { DashboardScreen } from "@/features/dashboard";
import {
  listClinicAppointments,
  listFacilityBedInventory,
  listMyInventoryFacilities,
  listMyPractices,
} from "@startup/data-access";
import type {
  BedInventoryProjection,
  ClinicAppointment,
} from "@startup/contracts";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const client = await createClient();
  let inventory: BedInventoryProjection[] = [];
  let appointments: ClinicAppointment[] = [];
  let loadError: string | undefined;
  
  try {
    const [facilities, practices] = await Promise.all([
      listMyInventoryFacilities(client),
      listMyPractices(client),
    ]);
    if (facilities[0])
      inventory = await listFacilityBedInventory(
        client,
        facilities[0].facilityId
      );
    if (practices[0])
      appointments = await listClinicAppointments(
        client,
        practices[0].practice_id
      );
  } catch {
    loadError =
      "Dashboard data is unavailable. Check your facility membership and try again.";
  }
  return (
    <DashboardScreen
      doctorAction={<AddDoctorAction />}
      inventory={inventory}
      appointments={appointments}
      loadError={loadError}
      acceptAppointment={changePortalAppointment}
    />
  );
}
