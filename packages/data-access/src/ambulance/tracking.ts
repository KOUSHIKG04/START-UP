import { activeAmbulanceTrackingSchema, updateDriverLocationSchema, uuidSchema } from "@startup/contracts";
import type { UpdateDriverLocationInput } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function updateMyDriverLocation(client: AppSupabaseClient, input: UpdateDriverLocationInput) {
  const location = updateDriverLocationSchema.parse(input);
  const { data, error } = await client.rpc("update_my_driver_location", {
    p_shift_id: location.shiftId,
    p_latitude: location.latitude,
    p_longitude: location.longitude,
    p_accuracy_meters: location.accuracyMeters,
    p_device_at: location.deviceAt,
    p_stream_epoch: location.streamEpoch,
    p_sequence: location.sequence,
  });
  if (error) throw error;
  return data === true;
}

export async function getMyActiveAmbulanceTracking(client: AppSupabaseClient, bookingId: string) {
  const { data, error } = await client.rpc("get_my_active_ambulance_tracking", { p_booking_id: uuidSchema.parse(bookingId) });
  if (error) throw error;
  return data === null ? null : activeAmbulanceTrackingSchema.parse(data);
}
