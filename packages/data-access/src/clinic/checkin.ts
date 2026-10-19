import { uuidSchema, clinicCheckinTokenSchema } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function issueClinicCheckinToken(
  client: AppSupabaseClient,
  appointmentId: string
) {
  const { data, error } = await client.rpc("issue_clinic_checkin_token", {
    p_appointment_id: uuidSchema.parse(appointmentId),
  });
  if (error) throw error;
  return clinicCheckinTokenSchema.parse(data);
}

export async function redeemClinicCheckinToken(
  client: AppSupabaseClient,
  token: string
) {
  const { data, error } = await client.rpc("redeem_clinic_checkin_token", {
    p_token: clinicCheckinTokenSchema.parse(token),
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}
