import {
  clinicBookingSchema,
  portalWalkInBookingSchema,
  clinicTransitionSchema,
  clinicAppointmentSchema,
  uuidSchema,
} from "@startup/contracts";
import type {
  ClinicBookingInput,
  PortalWalkInBookingInput,
  ClinicTransitionInput,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";
import { listMyPractices } from "./practices";

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

export async function bookPortalWalkInAppointment(
  client: AppSupabaseClient,
  input: PortalWalkInBookingInput
) {
  const request = portalWalkInBookingSchema.parse(input);
  const { data, error } = await client.rpc("book_portal_walk_in_appointment", {
    p_practice_id: request.practiceId,
    p_window_id: request.windowId,
    p_practice_service_id: request.practiceServiceId,
    p_patient_name: request.patientName,
    p_patient_phone: request.patientPhone || null,
    p_reason: request.reason || null,
    p_idempotency_key: request.idempotencyKey,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function listClinicAppointments(
  client: AppSupabaseClient,
  practiceId?: string
) {
  const { data, error } = await client.rpc("list_care_appointments", {
    p_practice_id: practiceId ? uuidSchema.parse(practiceId) : null,
  });
  if (error) throw error;
  return clinicAppointmentSchema.array().parse(data);
}

export async function listMyPracticeAppointments(client: AppSupabaseClient) {
  const practices = await listMyPractices(client);
  const groups = await Promise.all(
    practices.map((practice) =>
      listClinicAppointments(client, practice.practice_id)
    )
  );
  return [
    ...new Map(groups.flat().map((item) => [item.id, item])).values(),
  ].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
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
