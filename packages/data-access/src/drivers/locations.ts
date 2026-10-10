import { savedDriverLocationInputSchema, savedDriverLocationSchema } from "@startup/contracts";
import type { SavedDriverLocationInput } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function listMyDriverLocations(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("list_my_driver_locations");
  if (error) throw error;
  return savedDriverLocationSchema.array().parse(data);
}

export async function saveMyDriverLocation(client: AppSupabaseClient, input: SavedDriverLocationInput, locationId?: string) {
  const location = savedDriverLocationInputSchema.parse(input);
  const { data, error } = await client.rpc("save_my_driver_location", {
    p_location: location,
    p_location_id: locationId ?? null,
  });
  if (error) throw error;
  return data;
}

export async function selectMyDriverLocation(client: AppSupabaseClient, locationId: string) {
  const { error } = await client.rpc("select_my_driver_location", { p_location_id: locationId });
  if (error) throw error;
}

export async function deleteMyDriverLocation(client: AppSupabaseClient, locationId: string) {
  const { error } = await client.rpc("delete_my_driver_location", { p_location_id: locationId });
  if (error) throw error;
}

