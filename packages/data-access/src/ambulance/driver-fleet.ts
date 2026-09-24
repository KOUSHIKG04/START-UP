import {
  myAmbulanceFleetSchema,
  registerAmbulanceVehicleSchema,
  setDriverAvailabilitySchema,
  uuidSchema,
} from "@startup/contracts";
import type {
  RegisterAmbulanceVehicleInput,
  SetDriverAvailabilityInput,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function registerMyAmbulanceVehicle(
  client: AppSupabaseClient,
  input: RegisterAmbulanceVehicleInput
) {
  const vehicle = registerAmbulanceVehicleSchema.parse(input);
  const { data, error } = await client.rpc("register_my_ambulance_vehicle", {
    p_registration_number: vehicle.registrationNumber,
    p_display_label: vehicle.displayLabel,
    p_inspection_expires_on: vehicle.inspectionExpiresOn,
    p_capability_code: vehicle.capabilityCode,
    p_equipment_notes: vehicle.equipmentNotes,
    p_crew_notes: vehicle.crewNotes,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function listMyAmbulanceFleet(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("list_my_ambulance_fleet");
  if (error) throw error;
  return myAmbulanceFleetSchema.array().parse(data);
}

export async function setMyDriverAvailability(
  client: AppSupabaseClient,
  input: SetDriverAvailabilityInput
) {
  const request = setDriverAvailabilitySchema.parse(input);
  const { data, error } = await client.rpc("set_my_driver_availability", {
    p_vehicle_id: request.vehicleId,
    p_online: request.online,
    p_latitude: request.latitude ?? null,
    p_longitude: request.longitude ?? null,
  });
  if (error) throw error;
  return data === null ? null : uuidSchema.parse(data);
}
