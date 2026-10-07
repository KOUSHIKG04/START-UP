import { z } from "zod";

export const savedPatientLocationInputSchema = z.object({
  label: z.string().trim().min(1).max(80),
  kind: z.enum(["house", "office", "other", "current"]),
  building: z.string().trim().max(160).optional(),
  street: z.string().trim().max(200).optional(),
  locality: z.string().trim().max(160).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  instructions: z.string().trim().max(500).optional(),
  use_account_details: z.boolean().default(true),
  receiver_name: z.string().trim().max(120).optional(),
  receiver_phone: z.string().trim().optional(),
}).refine(value => (value.latitude === null) === (value.longitude === null), {
  message: "Latitude and longitude must be provided together",
}).refine(value => value.kind === "current" || Boolean(value.building), {
  message: "Building or floor is required",
}).refine(value => value.use_account_details || (Boolean(value.receiver_name && value.receiver_name.length >= 2) && /^\+[1-9]\d{7,14}$/.test(value.receiver_phone ?? "")), {
  message: "Enter a receiver name and international phone number",
});

export const savedPatientLocationSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  kind: z.enum(["house", "office", "other", "current"]),
  building: z.string().nullable(),
  street: z.string().nullable(),
  locality: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  pincode: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  instructions: z.string().nullable(),
  use_account_details: z.boolean(),
  receiver_name: z.string().nullable(),
  receiver_phone: z.string().nullable(),
  selected: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SavedPatientLocationInput = z.input<typeof savedPatientLocationInputSchema>;
export type SavedPatientLocation = z.infer<typeof savedPatientLocationSchema>;
