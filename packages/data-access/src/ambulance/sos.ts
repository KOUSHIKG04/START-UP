import { requestMySosSchema, uuidSchema } from "@startup/contracts";
import type { RequestMySosInput } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function requestMySos(client: AppSupabaseClient, input: RequestMySosInput) {
  const request = requestMySosSchema.parse(input);
  const { data, error } = await client.rpc("request_my_sos", {
    p_patient_id: request.patientId,
    p_pickup_latitude: request.pickupLatitude,
    p_pickup_longitude: request.pickupLongitude,
    p_pickup_address: request.pickupAddress,
    p_summary: request.summary,
    p_idempotency_key: request.idempotencyKey,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}
