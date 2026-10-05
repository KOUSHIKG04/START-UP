import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { listMyInventoryFacilities } from "@startup/data-access";

export const getFacilityAccess = cache(async () => {
  if (!getSupabaseConfig()) redirect("/login");

  const client = await createClient();
  const { data: claims, error: authError } = await client.auth.getClaims();
  if (authError || !claims) redirect("/login");

  let facilities: Awaited<ReturnType<typeof listMyInventoryFacilities>>;
  try {
    facilities = await listMyInventoryFacilities(client);
  } catch (error) {
    // A newly confirmed facility account has no Clinzo identity until it
    // registers its first facility. The registration RPC creates both.
    if (typeof error === "object" && error !== null && "code" in error
      && error.code === "42501" && "message" in error
      && error.message === "Portal membership setup is incomplete") {
      return { approved: false, facilities: [] };
    }
    throw error;
  }
  if (facilities.length === 0) return { approved: false, facilities };

  const cases = await Promise.all(facilities.map(async (facility) => {
    const { data, error } = await client.rpc("get_my_verification_case", {
      p_subject_type: "facility",
      p_subject_id: facility.facilityId,
    });
    if (error) throw error;
    return data as { status?: string } | null;
  }));

  return {
    approved: cases.some((item) => item?.status === "verified"),
    facilities,
  };
});

export async function requireApprovedFacility() {
  const access = await getFacilityAccess();
  if (!access.approved) redirect("/facility-verification");
  return access;
}
