import { z } from "zod";
import { uuidSchema } from "./validation";
import { ageFromBirthDate } from "./dates";
import { doctorPersonalAddressInputSchema } from "./doctor-locations";

export const doctorBirthDateSchema = z.iso.date().refine((value) => {
  const age = ageFromBirthDate(value);
  return age !== null && age >= 18 && age <= 100;
}, "Doctor age must be between 18 and 100.");

export const doctorQualificationSchema = z.string().trim().min(2).max(160);
export const doctorContactEmailSchema = z
  .string()
  .trim()
  .max(254)
  .regex(/^\S+@\S+\.\S+$/, "Enter a valid email address.");
export const doctorSpecialtiesSchema = z
  .array(
    z
      .string()
      .trim()
      .min(2)
      .max(120)
      .refine(
        (value) => value.toLowerCase() !== "other",
        "Enter the specialty name."
      )
  )
  .min(1)
  .max(12)
  .refine(
    (values) =>
      new Set(values.map((value) => value.toLowerCase())).size ===
      values.length,
    "Choose distinct specialties."
  );

export const doctorProfileSchema = z.object({
  id: uuidSchema,
  full_name: z.string(),
  contact_phone: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  profile_photo_path: z.string().nullable().optional(),
  bio: z.string().nullable(),
  qualification: z.string().nullable(),
  qualification_claim: z.string().nullable(),
  registration_authority: z.string(),
  registration_number: z.string(),
  practice_started_on: z.iso.date(),
  credential_status: z.enum(["pending", "verified", "suspended"]),
  booking_timezone: z.string(),
  languages: z.array(z.string()),
  specialties: z.array(z.object({ code: z.string(), name: z.string() })),
  facilities: z.array(
    z.object({
      practice_id: uuidSchema,
      facility_id: uuidSchema,
      facility_name: z.string(),
      facility_kind: z.enum(["hospital", "clinic"]),
      address: z.string(),
      can_edit_clinic: z.boolean().optional(),
      locality: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      pincode: z.string().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      active: z.boolean(),
    })
  ),
});

export const updateDoctorProfileSchema = z.object({
  personalAddress: doctorPersonalAddressInputSchema.optional(),
  fullName: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(2000).nullable(),
  languages: z
    .array(
      z
        .string()
        .trim()
        .regex(/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/)
    )
    .max(10),
});

export const ownedClinicLocationSchema = z.object({
  facilityId: uuidSchema,
  name: z.string().trim().min(2).max(160),
  address: z.string().trim().min(5).max(500),
  locality: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pincode: z.string().regex(/^[0-9]{6}$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type DoctorProfile = z.infer<typeof doctorProfileSchema>;
export type UpdateDoctorProfileInput = z.infer<
  typeof updateDoctorProfileSchema
>;
export type OwnedClinicLocationInput = z.infer<
  typeof ownedClinicLocationSchema
>;
