import {
  clinicBookingSchema,
  clinicTransitionSchema,
  publishClinicSessionSchema,
  clinicSlotSchema,
  clinicPracticeSchema,
  clinicSessionSchema,
  setClinicAutoConfirmLimitSchema,
  clinicAppointmentSchema,
  uuidSchema,
  clinicCheckinTokenSchema,
  clinicUnavailabilitySchema,
  addClinicUnavailabilitySchema,
  revokeClinicUnavailabilitySchema,
} from "@startup/contracts";
import type {
  ClinicBookingInput,
  ClinicTransitionInput,
  PublishClinicSessionInput,
  SetClinicAutoConfirmLimitInput,
  AddClinicUnavailabilityInput,
  RevokeClinicUnavailabilityInput,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function listMyPractices(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("list_my_practices");
  if (error) throw error;
  return clinicPracticeSchema.array().parse(data);
}

export async function listMyClinicSessions(client: AppSupabaseClient, practiceId: string) {
  const { data, error } = await client.rpc("list_my_clinic_sessions", { p_practice_id: uuidSchema.parse(practiceId) });
  if (error) throw error;
  return clinicSessionSchema.array().parse(data);
}

export async function setClinicAutoConfirmLimit(client: AppSupabaseClient, input: SetClinicAutoConfirmLimitInput) {
  const request = setClinicAutoConfirmLimitSchema.parse(input);
  const { data, error } = await client.rpc("set_clinic_auto_confirm_limit", {
    p_session_id: request.sessionId,
    p_expected_version: request.expectedVersion,
    p_limit: request.limit,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function listClinicUnavailability(client: AppSupabaseClient, practiceId: string) {
  const { data, error } = await client.rpc("list_clinic_unavailability", { p_practice_id: uuidSchema.parse(practiceId) });
  if (error) throw error;
  return clinicUnavailabilitySchema.array().parse(data);
}

export async function addClinicUnavailability(client: AppSupabaseClient, input: AddClinicUnavailabilityInput) {
  const request = addClinicUnavailabilitySchema.parse(input);
  const { data, error } = await client.rpc("add_clinic_unavailability", {
    p_practice_id: request.practiceId,
    p_starts_at: request.startsAt,
    p_ends_at: request.endsAt,
    p_reason: request.reason,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function revokeClinicUnavailability(client: AppSupabaseClient, input: RevokeClinicUnavailabilityInput) {
  const request = revokeClinicUnavailabilitySchema.parse(input);
  const { data, error } = await client.rpc("revoke_clinic_unavailability", {
    p_exception_id: request.exceptionId,
    p_expected_version: request.expectedVersion,
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

export async function listClinicSlots(
  client: AppSupabaseClient,
  after = new Date(),
  limit = 50
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Invalid slot limit");
  }

  const { data, error } = await client.rpc("list_clinic_slots", {
    p_after: after.toISOString(),
    p_limit: limit,
  });
  if (error) throw error;
  return clinicSlotSchema.array().parse(data);
}

export async function listPracticeClinicSlots(
  client: AppSupabaseClient,
  practiceId: string,
  serviceId?: string
) {
  const { data, error } = await client.rpc("list_practice_clinic_slots", {
    p_practice_id: uuidSchema.parse(practiceId),
    p_service_id: serviceId ? uuidSchema.parse(serviceId) : null,
  });
  if (error) throw error;
  return clinicSlotSchema.array().parse(data);
}

export async function bookClinicAppointment(
  client: AppSupabaseClient,
  input: ClinicBookingInput
) {
  const request = clinicBookingSchema.parse(input);
  const { data, error } = await client.rpc("book_clinic_appointment", {
    p_patient_id: request.patientId,
    p_window_id: request.windowId,
    p_practice_service_id: request.practiceServiceId,
    p_reason: request.reason,
    p_idempotency_key: request.idempotencyKey,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function listClinicAppointments(
  client: AppSupabaseClient,
  practiceId?: string
) {
  const { data, error } = await client.rpc("list_clinic_appointments", {
    p_practice_id: practiceId ? uuidSchema.parse(practiceId) : null,
  });
  if (error) throw error;
  return clinicAppointmentSchema.array().parse(data);
}

export async function transitionClinicAppointment(
  client: AppSupabaseClient,
  input: ClinicTransitionInput
) {
  const request = clinicTransitionSchema.parse(input);
  const { data, error } = await client.rpc("transition_clinic_appointment", {
    p_appointment_id: request.appointmentId,
    p_expected_version: request.expectedVersion,
    p_action: request.action,
    p_note: request.note ?? null,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function issueClinicCheckinToken(client: AppSupabaseClient, appointmentId: string) {
  const { data, error } = await client.rpc("issue_clinic_checkin_token", { p_appointment_id: uuidSchema.parse(appointmentId) });
  if (error) throw error;
  return clinicCheckinTokenSchema.parse(data);
}

export async function redeemClinicCheckinToken(client: AppSupabaseClient, token: string) {
  const { data, error } = await client.rpc("redeem_clinic_checkin_token", { p_token: clinicCheckinTokenSchema.parse(token) });
  if (error) throw error;
  return uuidSchema.parse(data);
}
