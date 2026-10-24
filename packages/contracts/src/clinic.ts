import { z } from "zod";
import { uuidSchema } from "./validation";
import { appointmentRecoverySchema } from "./appointment-recovery";

export const clinicBookingSchema = z
  .object({
    patientId: uuidSchema,
    windowId: uuidSchema,
    practiceServiceId: uuidSchema,
    reason: z.string().trim().max(1000),
    idempotencyKey: uuidSchema,
  })
  .strict();

export const portalWalkInBookingSchema = z
  .object({
    practiceId: uuidSchema,
    windowId: uuidSchema,
    practiceServiceId: uuidSchema,
    patientName: z.string().trim().min(2).max(160),
    patientAge: z.number().int().min(0).max(120).nullable().optional(),
    patientGender: z
      .enum(["Male", "Female", "Other", "Prefer not to say"])
      .nullable()
      .optional(),
    checkIn: z.boolean().optional(),
    patientPhone: z
      .string()
      .trim()
      .regex(/^[+0-9() .-]*$/)
      .max(30),
    reason: z.string().trim().max(1000),
    idempotencyKey: uuidSchema,
  })
  .strict();

export type PortalWalkInBookingInput = z.infer<
  typeof portalWalkInBookingSchema
>;

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

export const publishDoctorServiceSessionSchema =
  publishClinicSessionSchema.extend({
    mode: z.enum(["clinic", "online", "home"]),
  });

export type PublishDoctorServiceSessionInput = z.infer<
  typeof publishDoctorServiceSessionSchema
>;

export const publishSelectedDoctorSlotsSchema = publishClinicSessionSchema
  .omit({ startsAt: true, endsAt: true })
  .extend({
    mode: z.enum(["clinic", "online", "home"]),
    slotStarts: z
      .array(z.iso.datetime({ offset: true }))
      .min(1)
      .max(100),
  });

export type PublishSelectedDoctorSlotsInput = z.infer<
  typeof publishSelectedDoctorSlotsSchema
>;

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
  service_mode: z.enum(["clinic", "online", "home"]).optional(),
  daily_bookings_remaining: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional(),
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

export const portalClinicDaySchema = z.object({
  local_day: z.iso.date(),
  timezone: z.string(),
  clinic_start: z.string(),
  clinic_end: z.string(),
  clinic_time_blocks: z
    .array(z.object({ start: z.string(), end: z.string() }))
    .optional(),
  doctor_timeline: z
    .array(
      z.object({
        session_id: uuidSchema,
        practice_id: uuidSchema,
        service_mode: z.enum(["clinic", "online", "home"]),
        starts_at: z.string(),
        ends_at: z.string(),
        travel_buffer_minutes: z.number().int().nonnegative(),
        state: z.string(),
      })
    )
    .optional(),
  total_limit: z.number().int().nonnegative(),
  app_limit: z.number().int().nonnegative(),
  walkin_limit: z.number().int().nonnegative(),
  total_used: z.number().int().nonnegative(),
  app_used: z.number().int().nonnegative(),
  walkin_used: z.number().int().nonnegative(),
  app_remaining: z.number().int().nonnegative(),
  walkin_remaining: z.number().int().nonnegative(),
  slots: z.array(
    clinicSlotSchema.extend({
      state: z.enum(["open", "booked", "unavailable", "past"]),
    })
  ),
});

export type PortalClinicDay = z.infer<typeof portalClinicDaySchema>;

export const clinicPracticeSchema = z.object({
  practice_id: uuidSchema,
  doctor_name: z.string(),
  facility_name: z.string(),
  verified: z.boolean(),
  is_clinician: z.boolean(),
});

export const clinicSessionSchema = z.object({
  id: uuidSchema,
  service_mode: z.enum(["clinic", "online", "home"]),
  starts_at: z.string(),
  ends_at: z.string(),
  timezone: z.string(),
  hard_capacity: z.number().int().positive(),
  auto_confirm_limit: z.number().int().nonnegative().nullable(),
  state: z.enum(["published", "open", "closed", "cancelled"]),
  row_version: z.string(),
  available_slots: z
    .array(z.object({ starts_at: z.string(), ends_at: z.string() }))
    .optional(),
});

export const setClinicAutoConfirmLimitSchema = z
  .object({
    sessionId: uuidSchema,
    expectedVersion: z.coerce.number().int().positive().safe(),
    limit: z.number().int().nonnegative(),
  })
  .strict();

export const clinicUnavailabilitySchema = z.object({
  id: uuidSchema,
  starts_at: z.string(),
  ends_at: z.string(),
  reason: z.string(),
  service_mode: z.enum(["all", "clinic", "online", "home"]).default("all"),
  state: z.enum(["active", "revoked"]),
  row_version: z.string(),
});

export const addClinicUnavailabilitySchema = z
  .object({
    practiceId: uuidSchema,
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    reason: z.string().trim().min(2).max(500),
    serviceMode: z.enum(["all", "clinic", "online", "home"]).optional(),
    serviceModes: z
      .array(z.enum(["all", "clinic", "online", "home"]))
      .min(1)
      .max(3)
      .optional(),
  })
  .strict();

export const revokeClinicUnavailabilitySchema = z
  .object({
    exceptionId: uuidSchema,
    expectedVersion: z.coerce.number().int().positive().safe(),
  })
  .strict();

export const clinicAppointmentSchema = z.object({
  recovery: appointmentRecoverySchema.optional(),
  id: uuidSchema,
  practice_id: uuidSchema.nullish(),
  practice_service_id: uuidSchema.nullish(),
  visit_mode: z.enum(["clinic", "online", "home"]),
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
  patient_phone: z.string().nullish(),
  source: z
    .enum([
      "patient_online",
      "reception_walk_in",
      "staff_booking",
      "offline_sync",
    ])
    .optional(),
  patient_public_code: z.string(),
  patient_gender: z.string().nullable(),
  patient_age_years: z.number().int().nullable(),
  patient_blood_group: z.string().nullable(),
  service_name: z.string(),
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

export type ClinicSlot = z.infer<typeof clinicSlotSchema>;

export type SetClinicAutoConfirmLimitInput = z.infer<
  typeof setClinicAutoConfirmLimitSchema
>;

export type ClinicUnavailability = z.infer<typeof clinicUnavailabilitySchema>;

export type AddClinicUnavailabilityInput = z.infer<
  typeof addClinicUnavailabilitySchema
>;

export type RevokeClinicUnavailabilityInput = z.infer<
  typeof revokeClinicUnavailabilitySchema
>;
