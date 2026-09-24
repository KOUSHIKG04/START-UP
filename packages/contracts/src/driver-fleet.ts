import { z } from "zod";
import { ambulanceCapabilityCodeSchema } from "./ambulance-booking";
import { uuidSchema } from "./validation";

export const registerAmbulanceVehicleSchema = z.object({
  registrationNumber: z.string().trim().min(4).max(32),
  displayLabel: z.string().trim().min(2).max(100),
  inspectionExpiresOn: z.iso.date(),
  capabilityCode: ambulanceCapabilityCodeSchema,
  equipmentNotes: z.string().trim().min(10).max(1000),
  crewNotes: z.string().trim().min(10).max(1000),
}).strict();

export const myAmbulanceFleetSchema = z.object({
  vehicle_id: uuidSchema,
  registration_number: z.string(),
  display_label: z.string(),
  inspection_expires_on: z.string(),
  capability_code: ambulanceCapabilityCodeSchema,
  review_status: z.enum(["pending", "approved", "rejected", "revoked"]),
  approved_until: z.string().nullable(),
  active_shift_id: uuidSchema.nullable(),
  desired_availability: z.enum(["online", "offline"]).nullable(),
  ready_to_go_available: z.boolean(),
});

export const setDriverAvailabilitySchema = z.object({
  vehicleId: uuidSchema,
  online: z.boolean(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).strict().refine((value) => !value.online || (value.latitude !== undefined && value.longitude !== undefined), {
  message: "Current location is required to go Available",
});

export type RegisterAmbulanceVehicleInput = z.infer<typeof registerAmbulanceVehicleSchema>;
export type MyAmbulanceFleet = z.infer<typeof myAmbulanceFleetSchema>;
export type SetDriverAvailabilityInput = z.infer<typeof setDriverAvailabilitySchema>;
