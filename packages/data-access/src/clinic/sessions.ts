import {
  publishClinicSessionSchema,
  publishDoctorServiceSessionSchema,
  publishSelectedDoctorSlotsSchema,
  clinicSessionSchema,
  setClinicAutoConfirmLimitSchema,
  uuidSchema,
} from "@startup/contracts";
import type {
  PublishClinicSessionInput,
  PublishDoctorServiceSessionInput,
  PublishSelectedDoctorSlotsInput,
  SetClinicAutoConfirmLimitInput,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function listMyClinicSessions(
  client: AppSupabaseClient,
  practiceId: string
) {
  const { data, error } = await client.rpc("list_my_clinic_sessions", {
    p_practice_id: uuidSchema.parse(practiceId),
  });
  if (error) throw error;
  return clinicSessionSchema.array().parse(data);
}

export async function setClinicAutoConfirmLimit(
  client: AppSupabaseClient,
  input: SetClinicAutoConfirmLimitInput
) {
  const request = setClinicAutoConfirmLimitSchema.parse(input);
  const { data, error } = await client.rpc("set_clinic_auto_confirm_limit", {
    p_session_id: request.sessionId,
    p_expected_version: request.expectedVersion,
    p_limit: request.limit,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function publishClinicSession(
  client: AppSupabaseClient,
  input: PublishClinicSessionInput
) {
  const request = publishClinicSessionSchema.parse(input);
  const { data, error } = await client.rpc("publish_clinic_session", {
    p_practice_id: request.practiceId,
    p_starts_at: request.startsAt,
    p_ends_at: request.endsAt,
    p_slot_minutes: request.slotMinutes,
    p_fee_minor: request.feeMinor,
    p_currency: request.currency,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function publishDoctorServiceSession(
  client: AppSupabaseClient,
  input: PublishDoctorServiceSessionInput
) {
  const request = publishDoctorServiceSessionSchema.parse(input);
  const { data, error } = await client.rpc("publish_doctor_service_session", {
    p_practice_id: request.practiceId,
    p_mode: request.mode,
    p_starts_at: request.startsAt,
    p_ends_at: request.endsAt,
    p_slot_minutes: request.slotMinutes,
    p_fee_minor: request.feeMinor,
    p_currency: request.currency,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function publishSelectedDoctorSlots(
  client: AppSupabaseClient,
  input: PublishSelectedDoctorSlotsInput
) {
  const request = publishSelectedDoctorSlotsSchema.parse(input);
  const { data, error } = await client.rpc("publish_selected_doctor_slots", {
    p_practice_id: request.practiceId,
    p_mode: request.mode,
    p_slot_starts: request.slotStarts,
    p_slot_minutes: request.slotMinutes,
    p_fee_minor: request.feeMinor,
    p_currency: request.currency,
  });
  if (error) throw error;
  return uuidSchema.array().parse(data);
}
