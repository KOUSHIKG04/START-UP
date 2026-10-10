import { z } from "zod";
import { registerAmbulanceVehicleSchema } from "./driver-fleet";
import { patientAddressSchema } from "./patient-profiles";

export const driverAddressSchema = patientAddressSchema
  .strict()
  .refine(
    (value) =>
      (value.latitude === undefined) === (value.longitude === undefined),
    "Provide both location coordinates."
  );

export const driverProfileInputSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    dateOfBirth: z.iso.date(),
    city: z.string().trim().min(2).max(120),
    address: driverAddressSchema.optional(),
    contactPhone: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/)
      .optional(),
    profilePhotoPath: z.string().optional(),
    consent: z.boolean(),
  })
  .strict();

export const driverProfileSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  date_of_birth: z.string().nullable(),
  city: z.string().nullable(),
  contact_phone: z.string().nullable(),
  home_address: driverAddressSchema.nullable().optional(),
  profile_photo_path: z.string().nullable(),
  verification_status: z.string(),
  license_number: z.string(),
  license_expires_on: z.string(),
  verification_consent_at: z.string().nullable(),
});

export const driverDocumentKindSchema = z.enum([
  "aadhaar",
  "pan",
  "driving_licence",
  "vehicle_rc",
  "insurance",
  "fitness",
  "ambulance_image",
  "equipment_images",
]);

export const driverVehicleSubmissionSchema = z
  .object({
    vehicle: registerAmbulanceVehicleSchema,
    documents: z.record(driverDocumentKindSchema, z.string().min(1)),
  })
  .strict();

export type DriverProfileInput = z.input<typeof driverProfileInputSchema>;
export type DriverDocumentKind = z.infer<typeof driverDocumentKindSchema>;
export type DriverVehicleSubmission = z.input<
  typeof driverVehicleSubmissionSchema
>;

export const driverRegistrationDetailsSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    contactPhone: z.string().regex(/^\+[1-9]\d{7,14}$/),
    dateOfBirth: z.iso.date(),
    city: z.string().trim().min(2).max(120),
    address: driverAddressSchema.optional(),
    profilePhotoPath: z.string().optional(),
    consent: z.literal(true),
  })
  .strict();

export const driverRegistrationApplicationSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  contact_phone: z.string(),
  date_of_birth: z.string(),
  city: z.string(),
  profile_photo_path: z.string().nullable(),
  home_address: driverAddressSchema.nullable().optional(),
  capability_code: z.enum(["BLS", "ALS", "NICU"]).nullable(),
  registration_number: z.string().nullable(),
  status: z.enum(["details_saved", "submitted", "approved", "rejected"]),
  submitted_at: z.string().nullable(),
});

export const driverRegistrationSubmissionSchema = z
  .object({
    capabilityCode: z.enum(["BLS", "ALS", "NICU"]),
    registrationNumber: z.string().trim().min(4).max(32),
    documents: z.record(driverDocumentKindSchema, z.string().min(1)),
  })
  .strict();

export type DriverRegistrationDetails = z.input<
  typeof driverRegistrationDetailsSchema
>;
export type DriverRegistrationSubmission = z.input<
  typeof driverRegistrationSubmissionSchema
>;
