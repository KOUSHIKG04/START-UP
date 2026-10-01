import { z } from "zod";

export const patientAddressSchema = z.object({
  building: z.string().trim().min(1).max(160),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pincode: z.string().regex(/^\d{6}$/),
});


const core = z.object({
  fullName: z.string().trim().min(2).max(120),
  age: z.number().int().min(0).max(120),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]),
});


export const patientProfileInputSchema = core.extend({
  email: z.email().optional(),
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
});


export const familyProfileListSchema = z.array(
  z.object({
    id: z.uuid(),
    full_name: z.string(),
    age_years: z.number().nullable(),
    gender: z.string().nullable(),
    blood_group: z.string().nullable(),
    relation: z.string().nullable(),
    phone: z.string().nullable(),
    verified: z.boolean(),
  })
);
export const patientProfileDetailSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  age_years: z.number().nullable(),
  age_recorded_on: z.string().nullable(),
  gender: z.string().nullable(),
  blood_group: z.string().nullable(),
  email: z.string().nullable(),
  address: patientAddressSchema.nullable(),
});
export type PatientProfileInput = z.input<typeof patientProfileInputSchema>;
export type FamilyProfileInput = z.input<typeof familyProfileInputSchema>;
