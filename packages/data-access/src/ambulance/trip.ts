import { completeDriverTripSchema, myDriverTripSchema, transitionDriverTripSchema, uuidSchema } from "@startup/contracts";
import type { CompleteDriverTripInput, TransitionDriverTripInput } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function listMyDriverTrips(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("list_my_driver_trips");
  if (error) throw error;
  return myDriverTripSchema.array().parse(data);
}

export async function transitionMyDriverTrip(client: AppSupabaseClient, input: TransitionDriverTripInput) {
  const request = transitionDriverTripSchema.parse(input);
  const { data, error } = await client.rpc("transition_my_driver_trip", {
    p_trip_id: request.tripId, p_expected_version: request.expectedVersion, p_action: request.action,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function completeMyDriverTrip(client: AppSupabaseClient, input: CompleteDriverTripInput) {
  const request = completeDriverTripSchema.parse(input);
  const { data, error } = await client.rpc("complete_my_driver_trip", {
    p_trip_id: request.tripId, p_pin: request.patientPin,
  });
  if (error) throw error;
  return data === true;
}

export async function getMyPatientVerificationPin(client: AppSupabaseClient, patientId: string) {
  const { data, error } = await client.rpc("get_my_patient_verification_pin", { p_patient_id: uuidSchema.parse(patientId) });
  if (error) throw error;
  return completeDriverTripSchema.shape.patientPin.parse(data);
}
