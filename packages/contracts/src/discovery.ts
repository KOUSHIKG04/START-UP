import { z } from "zod";
import { uuidSchema } from "./validation";

export const practiceSearchInputSchema = z.object({
  query: z.string().trim().max(100).optional(),
  specialtyCode: z.string().trim().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  practiceId: uuidSchema.optional(),
  limit: z.number().int().min(1).max(50).default(20),
}).refine((value) => (value.latitude === undefined) === (value.longitude === undefined), {
  message: "Latitude and longitude must be provided together",
});

export const publicPracticeSchema = z.object({
  practice_id: uuidSchema,
  doctor_id: uuidSchema,
  doctor_code: z.string(),
  doctor_name: z.string(),
  facility_id: uuidSchema,
  facility_code: z.string(),
  facility_name: z.string(),
  facility_kind: z.enum(["clinic", "hospital"]),
  address: z.string(),
  timezone: z.string(),
  practice_service_id: uuidSchema,
  service_code: z.string(),
  service_name: z.string(),
  fee_minor: z.string(),
  currency: z.string(),
  duration_minutes: z.number().int().positive(),
  experience_years: z.number().int().min(0),
  specialties: z.array(z.object({ code: z.string(), name: z.string() })),
  languages: z.array(z.string()),
  distance_meters: z.number().int().nullable(),
});

export type PracticeSearchInput = z.input<typeof practiceSearchInputSchema>;
export type PublicPractice = z.infer<typeof publicPracticeSchema>;
