import { z } from "zod";
import { uuidSchema } from "./validation";
import { driverTripStatusSchema } from "./ambulance-trip";

export const updateDriverLocationSchema = z.object({
  shiftId: uuidSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).max(1000),
  deviceAt: z.iso.datetime({ offset: true }),
  streamEpoch: uuidSchema,
  sequence: z.number().int().nonnegative().safe(),
}).strict();

export const activeAmbulanceTrackingSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy_meters: z.number(),
  received_at: z.string(),
  trip_status: driverTripStatusSchema,
});

export type UpdateDriverLocationInput = z.infer<typeof updateDriverLocationSchema>;
export type ActiveAmbulanceTracking = z.infer<typeof activeAmbulanceTrackingSchema>;
