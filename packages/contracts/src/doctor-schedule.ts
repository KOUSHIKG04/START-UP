import { z } from "zod";

export const doctorTimeBlockSchema = z
  .object({
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/),
  })
  .strict()
  .refine((block) => block.end > block.start, {
    message: "Each time block must end after it starts.",
  });

export type DoctorTimeBlock = z.infer<typeof doctorTimeBlockSchema>;

export function scheduleBlocksError(
  blocks: DoctorTimeBlock[],
  duration: number,
  buffer = 0
): string | undefined {
  const minutes = (clock: string) =>
    Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
  if (!blocks.length || blocks.length > 8)
    return "Add between 1 and 8 time blocks.";
  const ordered = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  for (let index = 0; index < ordered.length; index++) {
    const block = ordered[index];
    if (
      !doctorTimeBlockSchema.safeParse(block).success ||
      minutes(block.end) - minutes(block.start) < duration
    )
      return "Each time block must fit at least one appointment.";
    if (minutes(block.start) - buffer < 0 || minutes(block.end) + buffer > 1440)
      return "Travel buffers must fit within the same day.";
    if (
      index &&
      minutes(ordered[index - 1].end) + buffer > minutes(block.start) - buffer
    )
      return "Time blocks and travel buffers cannot overlap.";
  }
}

export const doctorScheduleSettingsSchema = z
  .object({
    workingDays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    onlineWorkingDays: z
      .array(z.number().int().min(1).max(7))
      .min(1)
      .max(7)
      .optional(),
    homeWorkingDays: z
      .array(z.number().int().min(1).max(7))
      .min(1)
      .max(7)
      .optional(),
    // Legacy per-mode approval fields: retained for older clients; booking uses autoAccept/autoAcceptLimit.
    onlineAutoAccept: z.boolean().optional(),
    homeAutoAccept: z.boolean().optional(),
    onlineAutoAcceptLimit: z.number().int().min(0).max(100).optional(),
    homeAutoAcceptLimit: z.number().int().min(0).max(100).optional(),
    clinicStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    clinicEnd: z.string().regex(/^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/),
    onlineStart: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    onlineEnd: z
      .string()
      .regex(/^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/)
      .optional(),
    homeStart: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    homeEnd: z
      .string()
      .regex(/^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/)
      .optional(),
    clinicTimeBlocks: z.array(doctorTimeBlockSchema).min(1).max(8).optional(),
    onlineTimeBlocks: z.array(doctorTimeBlockSchema).min(1).max(8).optional(),
    homeTimeBlocks: z.array(doctorTimeBlockSchema).min(1).max(8).optional(),
    homeTravelBufferMinutes: z.number().int().min(0).max(180).optional(),
    slotMinutes: z.number().int().min(5).max(120),
    onlineSlotMinutes: z.number().int().min(5).max(120),
    homeSlotMinutes: z.number().int().min(30).max(120),
    onlineDailyLimit: z.number().int().min(0).max(100),
    walkinDailyLimit: z.number().int().min(0).max(100),
    clinicAppDailyLimit: z.number().int().min(0).max(100).optional(),
    clinicWalkinDailyLimit: z.number().int().min(0).max(100).optional(),
    autoAccept: z.boolean(),
    autoAcceptLimit: z.number().int().min(0).max(100),
    homeVisits: z.boolean(),
    homeRadiusKm: z.number().positive().max(9999.99).nullable(),
    onlineFeeMinor: z.number().int().min(0).max(100000000).nullable(),
    clinicFeeMinor: z.number().int().min(0).max(100000000),
    homeFeeMinor: z.number().int().min(0).max(100000000).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    for (const [key, duration, buffer] of [
      ["clinicTimeBlocks", value.slotMinutes, 0],
      ["onlineTimeBlocks", value.onlineSlotMinutes, 0],
      [
        "homeTimeBlocks",
        value.homeSlotMinutes,
        value.homeTravelBufferMinutes ?? 0,
      ],
    ] as const) {
      if (value[key]) {
        const message = scheduleBlocksError(value[key], duration, buffer);
        if (message) context.addIssue({ code: "custom", path: [key], message });
      }
    }
  })
  .refine(
    (value) =>
      value.clinicEnd > value.clinicStart &&
      (!value.onlineStart ||
        !value.onlineEnd ||
        value.onlineEnd > value.onlineStart) &&
      (!value.homeStart || !value.homeEnd || value.homeEnd > value.homeStart) &&
      new Set(value.workingDays).size === value.workingDays.length &&
      [value.onlineWorkingDays, value.homeWorkingDays].every(
        (days) => !days || new Set(days).size === days.length
      ) &&
      (!value.homeVisits || value.homeRadiusKm !== null),
    { message: "Check working days and clinic hours" }
  )
  .refine(
    (value) =>
      (value.clinicAppDailyLimit ?? value.walkinDailyLimit) +
        (value.clinicWalkinDailyLimit ?? 0) <=
      value.walkinDailyLimit,
    {
      message: "App and walk-in quotas must fit within total clinic capacity.",
      path: ["walkinDailyLimit"],
    }
  );

export const doctorSchedulePreferencesSchema = z.object({
  online_grace_minutes: z.number().int().optional(),
  reschedule_cutoff_minutes: z.number().int().optional(),
  max_self_reschedules: z.number().int().optional(),
  practice_id: z.uuid(),
  working_days: z.array(z.number().int()),
  online_working_days: z.array(z.number().int()).optional(),
  home_working_days: z.array(z.number().int()).optional(),
  online_auto_accept: z.boolean().optional(),
  home_auto_accept: z.boolean().optional(),
  online_auto_accept_limit: z.number().int().optional(),
  home_auto_accept_limit: z.number().int().optional(),
  clinic_start: z.string(),
  clinic_end: z.string(),
  online_start: z.string().optional(),
  online_end: z.string().optional(),
  home_start: z.string().optional(),
  home_end: z.string().optional(),
  clinic_time_blocks: z.array(doctorTimeBlockSchema).optional(),
  online_time_blocks: z.array(doctorTimeBlockSchema).optional(),
  home_time_blocks: z.array(doctorTimeBlockSchema).optional(),
  home_travel_buffer_minutes: z.number().int().optional(),
  published_modes: z.array(z.enum(["clinic", "online", "home"])).optional(),
  published_from: z.record(z.string(), z.iso.date()).optional(),
  slot_minutes: z.number().int(),
  online_slot_minutes: z.number().int(),
  home_slot_minutes: z.number().int(),
  online_daily_limit: z.number().int(),
  walkin_daily_limit: z.number().int(),
  clinic_app_daily_limit: z.number().int().optional(),
  clinic_walkin_daily_limit: z.number().int().optional(),
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

export type DoctorSchedulePreferences = z.infer<
  typeof doctorSchedulePreferencesSchema
>;

export const doctorSchedulePublicationSchema = z.object({
  settings: doctorSchedulePreferencesSchema,
  slot_count: z.number().int().nonnegative(),
  horizon_days: z.number().int().positive(),
});
