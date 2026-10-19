import {
  uuidSchema,
  clinicUnavailabilitySchema,
  addClinicUnavailabilitySchema,
  revokeClinicUnavailabilitySchema,
} from "@startup/contracts";
import type {
  AddClinicUnavailabilityInput,
  RevokeClinicUnavailabilityInput,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function listClinicUnavailability(
  client: AppSupabaseClient,
  practiceId: string
) {
  const { data, error } = await client.rpc("list_clinic_unavailability", {
    p_practice_id: uuidSchema.parse(practiceId),
  });
  if (error) throw error;
  return clinicUnavailabilitySchema.array().parse(data);
}

export async function addClinicUnavailability(
  client: AppSupabaseClient,
  input: AddClinicUnavailabilityInput
) {
  const request = addClinicUnavailabilitySchema.parse(input);
  const { data, error } = await client.rpc(
    "add_doctor_unavailability_for_services",
    {
      p_practice_id: request.practiceId,
      p_starts_at: request.startsAt,
      p_ends_at: request.endsAt,
      p_reason: request.reason,
      p_service_modes: request.serviceModes ?? [request.serviceMode ?? "all"],
    }
  );
  if (error) throw Object.assign(new Error(error.message), error);
  return uuidSchema.array().parse(data)[0]!;
}

export async function revokeClinicUnavailability(
  client: AppSupabaseClient,
  input: RevokeClinicUnavailabilityInput
) {
  const request = revokeClinicUnavailabilitySchema.parse(input);
  const { data, error } = await client.rpc("revoke_clinic_unavailability", {
    p_exception_id: request.exceptionId,
    p_expected_version: request.expectedVersion,
  });
  if (error) throw Object.assign(new Error(error.message), error);
  return uuidSchema.parse(data);
}
