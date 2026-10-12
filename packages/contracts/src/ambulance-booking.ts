import { z } from "zod";
import { uuidSchema } from "./validation";

export const ambulanceCapabilityCodeSchema = z.enum(["BLS", "ALS", "NICU"]);
export const publicHospitalSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  distance_meters: z.number().int().nullable(),
});

export const requestAmbulanceBookingSchema = z
  .object({
    patientId: uuidSchema,
    pickupLatitude: z.number().min(-90).max(90),
    pickupLongitude: z.number().min(-180).max(180),
    pickupAddress: z.string().trim().min(5).max(500),
    destinationFacilityId: uuidSchema,
    capabilityCode: ambulanceCapabilityCodeSchema,
    idempotencyKey: uuidSchema,
  })
  .strict();

export const myAmbulanceBookingSchema = z.object({
  id: uuidSchema,
  public_code: z.string(),
  status: z.enum([
    "awaiting_location",
    "searching",
    "assigned",
    "fulfilled",
    "cancelled",
    "unfulfilled",
  ]),
  booking_type: z.enum(["normal", "sos"]),
  created_at: z.string(),
  pickup_address: z.string().nullable(),
  destination_address: z.string().nullable(),
  row_version: z.string(),
  capability_code: ambulanceCapabilityCodeSchema,
  driver_name: z.string().nullable(),
  vehicle_registration: z.string().nullable(),
  operator_name: z.string().nullable(),
  trip_status: z
    .enum([
      "heading_to_pickup",
      "arrived_at_pickup",
      "in_progress",
      "arrived_at_destination",
      "completed",
      "cancelled",
    ])
    .nullable(),
  review_rating: z.number().int().min(1).max(5).nullable(),
  driver_rating: z.string().nullable(),
  driver_review_count: z.number().int().nonnegative(),
});

export const cancelAmbulanceBookingSchema = z
  .object({
    bookingId: uuidSchema,
    expectedVersion: z.coerce.number().int().positive().safe(),
  })
  .strict();

export const driverOfferSchema = z.object({
  id: uuidSchema,
  status: z.enum(["pending", "accepted", "rejected", "expired", "withdrawn"]),
  expires_at: z.string(),
  distance_meters: z.number().int().nonnegative(),
  radius_meters: z.number().int().positive(),
  booking_id: uuidSchema,
  booking_type: z.enum(["normal", "sos"]),
  pickup_address: z.string().nullable(),
  destination_address: z.string().nullable(),
  priority: z.number().int(),
  capability_code: ambulanceCapabilityCodeSchema,
});

export type PublicHospital = z.infer<typeof publicHospitalSchema>;
export type RequestAmbulanceBookingInput = z.infer<
  typeof requestAmbulanceBookingSchema
>;
export type MyAmbulanceBooking = z.infer<typeof myAmbulanceBookingSchema>;
export type CancelAmbulanceBookingInput = z.infer<
  typeof cancelAmbulanceBookingSchema
>;
export type DriverOffer = z.infer<typeof driverOfferSchema>;

export const googleHospitalSchema = z.object({
  id: z.string(), source: z.literal("google"), place_id: z.string().min(1).max(300),
  name: z.string(), address: z.string(), latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180), distance_meters: z.number().int().nullable(),
  attributions: z.array(z.object({ provider: z.string(), uri: z.url().optional() })).default([]),
});
export const googleHospitalSearchSchema = z.object({
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
  query: z.string().trim().max(160).default(""),
}).strict();
export const googleHospitalSearchResultSchema = z.object({ configured: z.boolean(), places: googleHospitalSchema.array() });
export const requestGoogleAmbulanceBookingSchema = requestAmbulanceBookingSchema.omit({ destinationFacilityId: true }).extend({
  destinationPlaceId: z.string().regex(/^[A-Za-z0-9_-]+$/).min(1).max(300),
}).strict();
export type GoogleHospital = z.infer<typeof googleHospitalSchema>;
export type AmbulanceHospital = PublicHospital | GoogleHospital;
export type RequestGoogleAmbulanceBookingInput = z.infer<typeof requestGoogleAmbulanceBookingSchema>;
