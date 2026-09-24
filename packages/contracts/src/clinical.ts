import { z } from "zod";
import { uuidSchema } from "./validation";

export const vitalCodeSchema = z.enum([
  "temperature_c", "pulse_bpm", "spo2_percent", "systolic_mmhg",
  "diastolic_mmhg", "weight_kg", "height_cm",
]);

export const recordVitalSchema = z.object({
  appointmentId: uuidSchema,
  code: vitalCodeSchema,
  value: z.number().finite().positive().max(10000),
  unit: z.string().trim().min(1).max(24),
}).strict();

export const recordDiagnosisSchema = z.object({
  appointmentId: uuidSchema,
  description: z.string().trim().min(2).max(1000),
  isPrimary: z.boolean(),
}).strict();

export const medicineTimingSchema = z.object({
  meal_anchor: z.enum(["breakfast", "lunch", "dinner", "bedtime"]),
  meal_relation: z.enum(["before", "with", "after", "independent"]),
}).strict();

export const prescriptionMedicineSchema = z.object({
  medicine_name: z.string().trim().min(2).max(160),
  strength: z.string().trim().min(1).max(80),
  form: z.string().trim().min(1).max(80),
  route: z.string().trim().min(1).max(80),
  instructions: z.string().trim().min(1).max(1000),
  dose_quantity: z.number().positive().max(1000),
  dose_unit: z.string().trim().min(1).max(40),
  starts_on: z.iso.date(),
  ends_on: z.iso.date(),
  timings: medicineTimingSchema.array().min(1).max(6),
}).strict();

export const issuePrescriptionSchema = z.object({
  appointmentId: uuidSchema,
  items: prescriptionMedicineSchema.array().min(1).max(20),
  timezone: z.string().min(1).max(64),
}).strict();

export const recommendFollowupSchema = z.object({
  appointmentId: uuidSchema,
  date: z.iso.date(),
  timezone: z.string().min(1).max(64),
  reason: z.string().trim().min(2).max(1000),
}).strict();

export const clinicalRecordSchema = z.object({
  appointment_code: z.string(),
  appointment_id: uuidSchema,
  started_at: z.string(),
  signed_at: z.string().nullable(),
  doctor_name: z.string(),
  facility_name: z.string(),
  assessment: z.string().nullable(),
  diagnoses: z.array(z.object({ description: z.string(), is_primary: z.boolean() })),
  vitals: z.array(z.object({ code: z.string(), value: z.string(), unit: z.string(), measured_at: z.string() })),
  medicines: z.array(z.object({ medicine_name: z.string(), strength: z.string(), form: z.string(), route: z.string(), instructions: z.string(),
    schedule: z.object({ dose_quantity: z.string(), dose_unit: z.string(), starts_on: z.string(), ends_on: z.string().nullable(), timings: medicineTimingSchema.array() }).nullable(),
  })),
  followup: z.object({ recommended_date: z.string(), reason: z.string(), status: z.literal("active") }).nullable(),
});

export type RecordVitalInput = z.infer<typeof recordVitalSchema>;
export type ClinicalRecord = z.infer<typeof clinicalRecordSchema>;
export type RecordDiagnosisInput = z.infer<typeof recordDiagnosisSchema>;
export type IssuePrescriptionInput = z.infer<typeof issuePrescriptionSchema>;
export type RecommendFollowupInput = z.infer<typeof recommendFollowupSchema>;
