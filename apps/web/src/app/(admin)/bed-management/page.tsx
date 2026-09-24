import { listFacilityBedInventory, listMyInventoryFacilities } from "@startup/data-access";
import type { BedInventoryProjection, InventoryFacility } from "@startup/contracts";
import { BedManagementScreen } from "@/features/facilities";
import { signOut } from "@/features/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { redirect } from "next/navigation";

export default async function BedManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ facility?: string }>;
}) {
  if (!getSupabaseConfig()) redirect("/login");
  const client = await createClient();
  const { data: claims, error: authError } = await client.auth.getClaims();
  if (authError || !claims) redirect("/login");
  let facilities: InventoryFacility[] = [];
  let inventory: BedInventoryProjection[] = [];
  let selectedFacilityId: string | null = null;
  let loadError: string | undefined;
  try {
    facilities = await listMyInventoryFacilities(client);
    const requested = (await searchParams).facility;
    const facility = facilities.find((item) => item.facilityId === requested) ?? facilities[0];
    selectedFacilityId = facility?.facilityId ?? null;
    inventory = facility
      ? await listFacilityBedInventory(client, facility.facilityId)
      : [];
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String(error.code) : null;
    loadError = code === "42501"
      ? "Your account is not linked to an active facility membership. Ask your administrator to complete access setup."
      : "Bed inventory is unavailable. Check that the portal migrations are applied, then try again.";
  }
  return <BedManagementScreen facilities={facilities} selectedFacilityId={selectedFacilityId} inventory={inventory} signOutAction={signOut} loadError={loadError} />;
}
