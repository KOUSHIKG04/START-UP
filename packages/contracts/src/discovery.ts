import { z } from "zod";
import { uuidSchema } from "./validation";

export const practiceSearchInputSchema = z
  .object({
    query: z.string().trim().max(100).optional(),
    specialtyCode: z.string().trim().max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    practiceId: uuidSchema.optional(),
    serviceMode: z.enum(["clinic", "online", "home"]).optional(),
    offset: z.number().int().min(0).max(100000).default(0),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .refine(
    (value) =>
      (value.latitude === undefined) === (value.longitude === undefined),
    {
      message: "Latitude and longitude must be provided together",
    }
  );

export const publicPracticeSchema = z.object({
  practice_id: uuidSchema,
  doctor_id: uuidSchema,
  doctor_code: z.string(),
  doctor_name: z.string(),
  qualification: z.string().nullable(),
  bio: z.string().nullable().optional(),
  rating: z.string().nullable(),
  review_count: z.number().int().nonnegative(),
  online_fee_minor: z.string().nullable(),
  online_enabled: z.boolean().default(false),
  facility_id: uuidSchema,
  facility_code: z.string(),
  facility_name: z.string(),
  facility_kind: z.enum(["clinic", "hospital"]),
  address: z.string(),
  timezone: z.string(),
  practice_service_id: uuidSchema.nullable(),
  has_available_slots: z.boolean().default(false),
  next_available_at: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
  service_code: z.string(),
  service_name: z.string(),
  fee_minor: z.string().nullable(),
  currency: z.string(),
  duration_minutes: z.number().int().positive().nullable(),
  experience_years: z.number().int().min(0),
  specialties: z.array(z.object({ code: z.string(), name: z.string() })),
  languages: z.array(z.string()),
  distance_meters: z.number().int().nullable(),
});

export type PracticeSearchInput = z.input<typeof practiceSearchInputSchema>;
export type PublicPractice = z.infer<typeof publicPracticeSchema>;
