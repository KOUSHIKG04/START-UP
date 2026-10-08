import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function setMyProfilePhoto(
  client: AppSupabaseClient,
  kind: "patient" | "doctor" | "facility",
  path: string,
  facilityId?: string,
) {
  const { error } = await client.rpc("set_my_profile_photo", {
    p_kind: kind,
    p_path: path,
    p_facility_id: facilityId ?? null,
  });
  if (error) throw error;
}
