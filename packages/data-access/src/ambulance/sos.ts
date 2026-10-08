import { requestMySosSchema, requestOnboardingSosSchema, uuidSchema } from "@startup/contracts";
import type { RequestMySosInput, RequestOnboardingSosInput } from "@startup/contracts";
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

export async function requestOnboardingSos(client: AppSupabaseClient, input: RequestOnboardingSosInput) {
  const request = requestOnboardingSosSchema.parse(input);
  const { data, error } = await client.rpc("request_onboarding_sos", {
    p_details: {
      full_name: request.fullName, contact_phone: request.contactPhone,
      pickup_latitude: request.pickupLatitude, pickup_longitude: request.pickupLongitude,
      pickup_address: request.pickupAddress, summary: request.summary,
      idempotency_key: request.idempotencyKey,
    },
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}
