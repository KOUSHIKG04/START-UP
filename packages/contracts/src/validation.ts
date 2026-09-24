import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const phoneSchema = z
  .string()
  .regex(/^\+[1-9][0-9]{7,14}$/, "Use an international phone number");


export const otpSchema = z
  .string()
  .regex(/^\d{4,8}$/, "Enter the code from your sign-in message");

export const patientOnboardingSchema = z
  .object({
    kind: z.literal("patient"),
    details: z
      .object({ full_name: z.string().trim().min(2).max(120) })
      .strict(),
  })
  .strict();

const doctorDetails = z
  .object({
    full_name: z.string().trim().min(2).max(120),
    registration_authority: z.string().trim().min(2).max(120),
    registration_number: z.string().trim().min(2).max(120),
    practice_started_on: z.iso.date(),
  })
  .strict();


export const doctorOnboardingSchema = z
  .object({
    kind: z.literal("doctor"),
    details: doctorDetails,
  })
  .strict();


export const soloDoctorOnboardingSchema = z
  .object({
    kind: z.literal("solo_doctor"),
    details: doctorDetails.extend({
      clinic_name: z.string().trim().min(2).max(160),
      address: z.string().trim().min(5).max(500),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
  })
  .strict();

const driverDetails = z
  .object({
    full_name: z.string().trim().min(2).max(120),
    license_number: z.string().trim().min(2).max(120),
    license_expires_on: z.iso.date(),
  })
  .strict();

  
export const independentDriverOnboardingSchema = z
  .object({
    kind: z.literal("driver_independent"),
    details: driverDetails,
  })
  .strict();


export const invitedDriverOnboardingSchema = z
  .object({
    kind: z.literal("driver_invited"),
    details: driverDetails.extend({
      invitation_token: z.string().min(32).max(128),
    }),
  })
  .strict();

export const onboardingSchema = z.discriminatedUnion("kind", [
  patientOnboardingSchema,
  doctorOnboardingSchema,
  soloDoctorOnboardingSchema,
  independentDriverOnboardingSchema,
  invitedDriverOnboardingSchema,
]);


export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const myProfileSchema = z.object({
  identity_id: uuidSchema,
  display_name: z.string(),
  patient_id: uuidSchema.nullable(),
  doctor: z
    .object({
      id: uuidSchema,
      status: z.enum(["pending", "verified", "suspended"]),
    })
    .nullable(),
  driver: z
    .object({
      id: uuidSchema,
      status: z.enum(["pending", "verified", "suspended"]),
      organization_id: uuidSchema,
    })
    .nullable(),
  memberships: z.array(
    z.object({
      organization_id: uuidSchema,
      facility_id: uuidSchema.nullable(),
      role: z.enum([
        "owner",
        "receptionist",
        "facility_admin",
        "dispatcher",
        "organization_admin",
      ]),
      organization_name: z.string(),
    })
  ),
});


export type MyProfile = z.infer<typeof myProfileSchema>;
