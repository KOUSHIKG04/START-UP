import { facilityDoctorRosterItemSchema } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function listMyFacilityDoctors(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("list_my_facility_doctors");
  if (error) throw error;
  return facilityDoctorRosterItemSchema.array().parse(data);
}
