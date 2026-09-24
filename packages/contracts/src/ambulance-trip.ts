import { z } from "zod";
import { uuidSchema } from "./validation";

export const driverTripStatusSchema = z.enum([
  "heading_to_pickup", "arrived_at_pickup", "in_progress", "arrived_at_destination", "completed", "cancelled",
]);

export const myDriverTripSchema = z.object({
  id: uuidSchema,
  booking_id: uuidSchema,
  status: driverTripStatusSchema,
  row_version: z.string(),
  public_code: z.string(),
  booking_type: z.enum(["normal", "sos"]),
  pickup_address: z.string().nullable(),
  destination_address: z.string().nullable(),
  patient_name_snapshot: z.string().nullable(),
  contact_phone_snapshot: z.string().nullable(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  pickup_latitude: z.number(),
  pickup_longitude: z.number(),
  destination_latitude: z.number().nullable(),
  destination_longitude: z.number().nullable(),
});

export const transitionDriverTripSchema = z.object({
  tripId: uuidSchema,
  expectedVersion: z.coerce.number().int().positive().safe(),
  action: z.enum(["arrive_pickup", "start", "arrive_destination"]),
}).strict();

export const completeDriverTripSchema = z.object({
  tripId: uuidSchema,
  patientPin: z.string().regex(/^[0-9]{4}$/),
}).strict();

export type MyDriverTrip = z.infer<typeof myDriverTripSchema>;
export type TransitionDriverTripInput = z.infer<typeof transitionDriverTripSchema>;
export type CompleteDriverTripInput = z.infer<typeof completeDriverTripSchema>;
