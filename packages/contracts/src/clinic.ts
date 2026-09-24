import { z } from "zod";
import { uuidSchema } from "./validation";

export const clinicBookingSchema = z
  .object({
    patientId: uuidSchema,
    windowId: uuidSchema,
    practiceServiceId: uuidSchema,
    reason: z.string().trim().min(1).max(1000),
    idempotencyKey: uuidSchema,
  })
  .strict();

export const clinicCheckinTokenSchema = z.string().regex(/^[0-9a-f-]{72}$/);

export const publishClinicSessionSchema = z
  .object({
    practiceId: uuidSchema,
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    slotMinutes: z.number().int().min(5).max(120),
    feeMinor: z.number().int().min(0).max(100000000),
    currency: z.string().regex(/^[A-Z]{3}$/),
  })
  .strict();

export const clinicTransitionSchema = z
  .object({
    appointmentId: uuidSchema,
    expectedVersion: z.coerce.number().int().positive().safe(),
    action: z.enum([
      "approve",
      "reject",
      "cancel",
      "check_in",
      "call",
      "hold",
      "resume",
      "no_show",
      "start",
      "complete",
    ]),
    note: z.string().trim().max(10000).nullable().optional(),
  })
  .strict();

export const clinicSlotSchema = z.object({
  window_id: uuidSchema,
  practice_service_id: uuidSchema,
  practice_id: uuidSchema,
  doctor_name: z.string(),
  facility_name: z.string(),
  address: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  timezone: z.string(),
  fee_minor: z.string(),
  currency: z.string(),
});

export const clinicPracticeSchema = z.object({
  practice_id: uuidSchema,
  doctor_name: z.string(),
  facility_name: z.string(),
  verified: z.boolean(),
  is_clinician: z.boolean(),
});

export const clinicSessionSchema = z.object({
  id: uuidSchema,
  starts_at: z.string(),
  ends_at: z.string(),
  timezone: z.string(),
  hard_capacity: z.number().int().positive(),
  auto_confirm_limit: z.number().int().nonnegative().nullable(),
  state: z.enum(["published", "open", "closed", "cancelled"]),
  row_version: z.string(),
});

export const setClinicAutoConfirmLimitSchema = z.object({
  sessionId: uuidSchema,
  expectedVersion: z.coerce.number().int().positive().safe(),
  limit: z.number().int().nonnegative(),
}).strict();

export const clinicUnavailabilitySchema = z.object({
  id: uuidSchema,
  starts_at: z.string(),
  ends_at: z.string(),
  reason: z.string(),
  state: z.enum(["active", "revoked"]),
  row_version: z.string(),
});

export const addClinicUnavailabilitySchema = z.object({
  practiceId: uuidSchema,
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  reason: z.string().trim().min(2).max(500),
}).strict();

export const revokeClinicUnavailabilitySchema = z.object({
  exceptionId: uuidSchema,
  expectedVersion: z.coerce.number().int().positive().safe(),
}).strict();

export const clinicAppointmentSchema = z.object({
  id: uuidSchema,
  public_code: z.string(),
  status: z.enum([
    "pending",
    "confirmed",
    "in_consultation",
    "completed",
    "rejected",
    "cancelled",
    "no_show",
  ]),
  row_version: z.string(),
  patient_id: uuidSchema,
  patient_name: z.string(),
  doctor_name: z.string(),
  facility_name: z.string(),
  reason: z.string().nullable(),
  fee_minor: z.string(),
  currency: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  timezone: z.string(),
  request_expires_at: z.string().nullable(),
  decision_reason: z.string().nullable(),
  queue_state: z
    .enum([
      "awaiting_arrival",
      "waiting",
      "called",
      "in_service",
      "held",
      "completed",
      "cancelled",
      "no_show",
    ])
    .nullable(),
  ticket_number: z.number().int().nullable(),
  ahead_count: z.number().int(),
  can_consult: z.boolean(),
  assessment: z.string().nullable(),
});

export type ClinicBookingInput = z.infer<typeof clinicBookingSchema>;
export type PublishClinicSessionInput = z.infer<
  typeof publishClinicSessionSchema
>;
export type ClinicTransitionInput = z.infer<typeof clinicTransitionSchema>;
export type ClinicAppointment = z.infer<typeof clinicAppointmentSchema>;
export type ClinicPractice = z.infer<typeof clinicPracticeSchema>;
export type ClinicSession = z.infer<typeof clinicSessionSchema>;
export type SetClinicAutoConfirmLimitInput = z.infer<typeof setClinicAutoConfirmLimitSchema>;
export type ClinicUnavailability = z.infer<typeof clinicUnavailabilitySchema>;
export type AddClinicUnavailabilityInput = z.infer<typeof addClinicUnavailabilitySchema>;
export type RevokeClinicUnavailabilityInput = z.infer<typeof revokeClinicUnavailabilitySchema>;
