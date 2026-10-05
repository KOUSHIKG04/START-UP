import { z } from "zod";

export const doctorScheduleSettingsSchema = z
  .object({
    workingDays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    clinicStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    clinicEnd: z.string().regex(/^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/),
    slotMinutes: z.number().int().min(5).max(120),
    onlineSlotMinutes: z.number().int().min(5).max(120),
    homeSlotMinutes: z.number().int().min(30).max(120),
    onlineDailyLimit: z.number().int().min(0).max(100),
    walkinDailyLimit: z.number().int().min(0).max(100),
    autoAccept: z.boolean(),
    autoAcceptLimit: z.number().int().min(0).max(100),
    homeVisits: z.boolean(),
    homeRadiusKm: z.number().positive().max(9999.99).nullable(),
    onlineFeeMinor: z.number().int().min(0).max(100000000).nullable(),
    clinicFeeMinor: z.number().int().min(0).max(100000000),
    homeFeeMinor: z.number().int().min(0).max(100000000).nullable(),
  })
  .strict()
  .refine(
    (value) =>
      value.clinicEnd > value.clinicStart &&
      new Set(value.workingDays).size === value.workingDays.length &&
      (!value.homeVisits || value.homeRadiusKm !== null),
    { message: "Check working days and clinic hours" }
  );

  
export const doctorSchedulePreferencesSchema = z.object({
  practice_id: z.uuid(),
  working_days: z.array(z.number().int()),
  clinic_start: z.string(),
  clinic_end: z.string(),
  slot_minutes: z.number().int(),
  online_slot_minutes: z.number().int(),
  home_slot_minutes: z.number().int(),
  online_daily_limit: z.number().int(),
  walkin_daily_limit: z.number().int(),
  auto_accept: z.boolean(),
  auto_accept_limit: z.number().int(),
  home_visits: z.boolean(),
  home_radius_km: z.number().positive().nullable(),
  online_fee_minor: z.number().nullable(),
  clinic_fee_minor: z.number(),
  home_fee_minor: z.number().nullable(),
  row_version: z.string(),
});

export type DoctorScheduleSettings = z.input<
  typeof doctorScheduleSettingsSchema
>;

export const doctorDailySlotUsageSchema = z.object({
  clinic: z.number().int().nonnegative(),
  online: z.number().int().nonnegative(),
  home: z.number().int().nonnegative(),
});
