import {
  cancelAmbulanceBookingSchema,
  driverOfferSchema,
  myAmbulanceBookingSchema,
  publicHospitalSchema,
  requestAmbulanceBookingSchema,
  uuidSchema,
} from "@startup/contracts";
import type {
  CancelAmbulanceBookingInput,
  RequestAmbulanceBookingInput,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function listPublicHospitals(
  client: AppSupabaseClient,
  coordinates?: { latitude: number; longitude: number }
) {
  const { data, error } = await client.rpc("list_public_hospitals", {
    p_latitude: coordinates?.latitude ?? null,
    p_longitude: coordinates?.longitude ?? null,
    p_limit: 50,
  });
  if (error) throw error;
  return publicHospitalSchema.array().parse(data);
}

export async function requestAmbulanceBooking(
  client: AppSupabaseClient,
  input: RequestAmbulanceBookingInput
) {
  const request = requestAmbulanceBookingSchema.parse(input);
  const { data, error } = await client.rpc("request_ambulance_booking", {
    p_patient_id: request.patientId,
    p_pickup_latitude: request.pickupLatitude,
    p_pickup_longitude: request.pickupLongitude,
    p_pickup_address: request.pickupAddress,
    p_destination_facility_id: request.destinationFacilityId,
    p_capability_code: request.capabilityCode,
    p_idempotency_key: request.idempotencyKey,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function listMyAmbulanceBookings(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("list_my_ambulance_bookings");
  if (error) throw error;
  return myAmbulanceBookingSchema.array().parse(data);
}

export async function cancelMyAmbulanceBooking(
  client: AppSupabaseClient,
  input: CancelAmbulanceBookingInput
) {
  const request = cancelAmbulanceBookingSchema.parse(input);
  const { data, error } = await client.rpc("cancel_my_ambulance_booking", {
    p_booking_id: request.bookingId,
    p_expected_version: request.expectedVersion,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function refreshMyAmbulanceDispatch(
  client: AppSupabaseClient,
  bookingId: string
) {
  const { data, error } = await client.rpc("refresh_my_ambulance_dispatch", {
    p_booking_id: uuidSchema.parse(bookingId),
  });
  if (error) throw error;
  return Number(data);
}

export async function listMyDriverOffers(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("list_my_driver_offers");
  if (error) throw error;
  return driverOfferSchema.array().parse(data);
}

export async function respondMyDriverOffer(
  client: AppSupabaseClient,
  offerId: string,
  accept: boolean
) {
  const { data, error } = await client.rpc("respond_my_driver_offer", {
    p_offer_id: uuidSchema.parse(offerId),
    p_accept: accept,
  });
  if (error) throw error;
  return data === null ? null : uuidSchema.parse(data);
}
