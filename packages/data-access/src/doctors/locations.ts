import {
  savedDoctorLocationInputSchema,
  savedDoctorLocationSchema,
} from "@startup/contracts";
import type { SavedDoctorLocationInput } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function listMyDoctorLocations(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("list_my_doctor_locations");
  if (error) throw error;
  return savedDoctorLocationSchema.array().parse(data);
}

export async function saveMyDoctorLocation(
  client: AppSupabaseClient,
  input: SavedDoctorLocationInput,
  locationId?: string
) {
  const location = savedDoctorLocationInputSchema.parse(input);
  const { data, error } = await client.rpc("save_my_doctor_location", {
    p_location: location,
    p_location_id: locationId ?? null,
  });
  if (error) throw error;
  return data;
}

export async function selectMyDoctorLocation(
  client: AppSupabaseClient,
  locationId: string
) {
  const { error } = await client.rpc("select_my_doctor_location", {
    p_location_id: locationId,
  });
  if (error) throw error;
}

export async function deleteMyDoctorLocation(
  client: AppSupabaseClient,
  locationId: string
) {
  const { error } = await client.rpc("delete_my_doctor_location", {
    p_location_id: locationId,
  });
  if (error) throw error;
}

export async function getMyDoctorPersonalAddress(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("get_my_doctor_personal_address");
  if (error) throw error;
  return data === null ? null : savedDoctorLocationSchema.parse(data);
}
