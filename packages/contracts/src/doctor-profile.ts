import { z } from "zod";
import { uuidSchema } from "./validation";

export const doctorProfileSchema = z.object({
  id: uuidSchema,
  full_name: z.string(),
  bio: z.string().nullable(),
  registration_authority: z.string(),
  registration_number: z.string(),
  practice_started_on: z.iso.date(),
  credential_status: z.enum(["pending", "verified", "suspended"]),
  booking_timezone: z.string(),
  languages: z.array(z.string()),
  specialties: z.array(z.object({ code: z.string(), name: z.string() })),
  facilities: z.array(z.object({
    practice_id: uuidSchema,
    facility_id: uuidSchema,
    facility_name: z.string(),
    facility_kind: z.enum(["hospital", "clinic"]),
    address: z.string(),
    active: z.boolean(),
  })),
});

export const updateDoctorProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(2000).nullable(),
  languages: z.array(z.string().trim().regex(/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/)).max(10),
});

export type DoctorProfile = z.infer<typeof doctorProfileSchema>;
export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>;
