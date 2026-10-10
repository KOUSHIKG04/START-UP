import { z } from "zod";
import { ageFromBirthDate } from "./dates";

export const patientAddressSchema = z.object({
  building: z.string().trim().min(1).max(160),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pincode: z.string().regex(/^\d{6}$/),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const core = z.object({
  fullName: z.string().trim().min(2).max(120),
  age: z.number().int().min(0).max(120),
  dateOfBirth: z.iso
    .date()
    .refine(
      (value) => ageFromBirthDate(value) !== null,
      "Enter a valid date of birth."
    )
    .optional(),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]),
});

export const patientProfileInputSchema = core.extend({
  email: z.email().optional(),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/)
    .optional(),
  address: patientAddressSchema.optional(),
});

export const familyProfileInputSchema = core.extend({
  relation: z.enum([
    "Son",
    "Daughter",
    "Father",
    "Mother",
    "Spouse",
    "Sibling",
    "Other",
  ]),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  notify: z.boolean(),
  profilePhotoPath: z.string().max(500).optional(),
});

export const familyProfileListSchema = z.array(
  z.object({
    id: z.uuid(),
    full_name: z.string(),
    age_years: z.number().nullable(),
    birth_date: z.string().nullable().optional(),
    gender: z.string().nullable(),
    blood_group: z.string().nullable(),
    relation: z.string().nullable(),
    phone: z.string().nullable(),
    verified: z.boolean(),
    profile_photo_path: z.string().nullable().optional(),
  })
);
export const patientProfileDetailSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  age_years: z.number().nullable(),
  age_recorded_on: z.string().nullable(),
  birth_date: z.string().nullable().optional(),
  gender: z.string().nullable(),
  blood_group: z.string().nullable(),
  email: z.string().nullable(),
  contact_phone: z.string().nullable().optional(),
  address: patientAddressSchema.nullable(),
  profile_photo_path: z.string().nullable().optional(),
});
export type PatientProfileInput = z.input<typeof patientProfileInputSchema>;
export type FamilyProfileInput = z.input<typeof familyProfileInputSchema>;
