import {
  clinicBookingSchema,
  portalWalkInBookingSchema,
  clinicTransitionSchema,
  clinicAppointmentSchema,
  uuidSchema,
  appointmentBookingOptionsSchema,
  preparedAppointmentBookingSchema,
  appointmentBookingRequestSchema,
} from "@startup/contracts";
import type {
  ClinicBookingInput,
  PortalWalkInBookingInput,
  ClinicTransitionInput,
  AppointmentBookingRequest,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";
import { listMyPractices } from "./practices";

export async function getAppointmentBookingOptions(
  client: AppSupabaseClient,
  windowId: string,
  practiceServiceId: string
) {
  const { data, error } = await client.rpc("get_appointment_booking_options", {
    p_window_id: uuidSchema.parse(windowId),
    p_practice_service_id: uuidSchema.parse(practiceServiceId),
  });
  if (error) throw error;
  return appointmentBookingOptionsSchema.parse(data);
}

export async function prepareAppointmentBooking(
  client: AppSupabaseClient,
  input: AppointmentBookingRequest
) {
  const request = appointmentBookingRequestSchema.parse(input);
  const args = {
    p_patient_id: request.patientId,
    p_window_id: request.windowId,
    p_practice_service_id: request.practiceServiceId,
    p_reason: request.reason,
    p_idempotency_key: request.idempotencyKey,
  };
  const { data, error } = request.locationId
    ? await client.rpc("prepare_home_visit_booking", {
        ...args,
        p_location_id: request.locationId,
      })
    : await client.rpc("prepare_appointment_booking", {
        ...args,
        p_payment_method: request.paymentMethod,
      });
  if (error) throw error;
  return preparedAppointmentBookingSchema.parse(data);
}

export async function releaseAppointmentBooking(
  client: AppSupabaseClient,
  appointmentId: string
) {
  const { error } = await client.rpc("release_appointment_booking", {
    p_appointment_id: uuidSchema.parse(appointmentId),
  });
  if (error) throw error;
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
    p_patient_age: request.patientAge ?? null,
    p_patient_gender: request.patientGender ?? null,
    p_check_in: request.checkIn ?? false,
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
