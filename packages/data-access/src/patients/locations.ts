import { savedPatientLocationInputSchema, savedPatientLocationSchema } from "@startup/contracts";
import type { SavedPatientLocationInput } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function listMyPatientLocations(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("list_my_patient_locations");
  if (error) throw error;
  return savedPatientLocationSchema.array().parse(data);
}

export async function saveMyPatientLocation(client: AppSupabaseClient, input: SavedPatientLocationInput, locationId?: string) {
  const location = savedPatientLocationInputSchema.parse(input);
  const { data, error } = await client.rpc("save_my_patient_location", {
    p_location: location,
    p_location_id: locationId ?? null,
  });
  if (error) throw error;
  return data;
}

export async function selectMyPatientLocation(client: AppSupabaseClient, locationId: string) {
  const { error } = await client.rpc("select_my_patient_location", { p_location_id: locationId });
  if (error) throw error;
}

export async function deleteMyPatientLocation(client: AppSupabaseClient, locationId: string) {
  const { error } = await client.rpc("delete_my_patient_location", { p_location_id: locationId });
  if (error) throw error;
}
