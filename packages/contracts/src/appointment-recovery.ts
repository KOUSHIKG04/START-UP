import { z } from "zod";
import { uuidSchema } from "./validation";
import type { ClinicAppointment } from "./clinic";

export const appointmentRecoverySchema = z.object({
  outcome: z.enum(["rescheduled", "doctor_unavailable"]).nullable(),
  rescheduled_from_id: uuidSchema.nullable(),
  rescheduled_to_id: uuidSchema.nullable(),
  reschedule_count: z.number().int().nonnegative(),
  online_grace_minutes: z.number().int().nonnegative(),
  reschedule_cutoff_minutes: z.number().int().nonnegative(),
  max_self_reschedules: z.number().int().nonnegative(),
  attendance_deadline: z.string(),
  can_manage: z.boolean(),
  request: z
    .object({
      id: uuidSchema,
      kind: z.enum(["reschedule", "review"]),
      reason: z.string(),
      status: z.enum(["pending", "approved", "rejected", "withdrawn"]),
      row_version: z.string(),
      target_starts_at: z.string().nullable(),
      decision_note: z.string().nullable(),
      replacement_id: uuidSchema.nullable(),
    })
    .nullable(),
});

export const recoveryPolicySchema = z
  .object({
    practiceId: uuidSchema,
    expectedVersion: z.number().int().positive().safe(),
    onlineGraceMinutes: z.number().int().min(0).max(180),
    rescheduleCutoffMinutes: z.number().int().min(0).max(10080),
    maxSelfReschedules: z.number().int().min(0).max(10),
  })
  .strict();

const versionedAppointment = z.object({
  appointmentId: uuidSchema,
  expectedVersion: z.number().int().positive().safe(),
});

export const rescheduleAppointmentSchema = versionedAppointment
  .extend({
    targetWindowId: uuidSchema,
    reason: z.string().trim().min(2).max(1000),
    idempotencyKey: uuidSchema,
  })
  .strict();

export const appointmentReviewSchema = versionedAppointment
  .extend({ reason: z.string().trim().min(2).max(1000) })
  .strict();

export const attendanceOutcomeSchema = versionedAppointment
  .extend({
    outcome: z.enum(["no_show", "doctor_unavailable"]),
    note: z.string().trim().max(1000),
  })
  .strict()
  .refine(
    (value) => value.outcome !== "doctor_unavailable" || value.note.length >= 2,
    { message: "Explain why the doctor was unavailable." }
  );

export const recoveryDecisionSchema = z
  .object({
    requestId: uuidSchema,
    expectedVersion: z.number().int().positive().safe(),
    approve: z.boolean(),
    note: z.string().trim().min(2).max(1000),
  })
  .strict();

export const recoveryResultSchema = z.object({
  kind: z.enum(["requested", "rescheduled", "reviewed"]),
  id: uuidSchema,
});

export type RecoveryPolicyInput = z.infer<typeof recoveryPolicySchema>;

export type RescheduleAppointmentInput = z.infer<
  typeof rescheduleAppointmentSchema
>;

export type AppointmentReviewInput = z.infer<typeof appointmentReviewSchema>;

export type AttendanceOutcomeInput = z.infer<typeof attendanceOutcomeSchema>;

export type RecoveryDecisionInput = z.infer<typeof recoveryDecisionSchema>;

export function appointmentRecoveryView(
  item: ClinicAppointment,
  now = Date.now()
) {
  const r = item.recovery;

  const started = Date.parse(item.starts_at);

  const expired =
    (item.status === "pending" &&
      Math.min(
        started,
        Date.parse(item.request_expires_at ?? item.starts_at)
      ) <= now) ||
    (item.status === "rejected" && item.decision_reason === "Request expired");

  const deadline = Date.parse(r?.attendance_deadline ?? item.ends_at);
  const passed = now >= deadline;

  const checkedIn =
    item.visit_mode === "clinic" &&
    ["waiting", "called", "held", "in_service"].includes(
      item.queue_state ?? ""
    );

  const inProgress = item.status === "in_consultation";
  const replaced = r?.outcome === "rescheduled";
  const doctorUnavailable = r?.outcome === "doctor_unavailable";
  const needsReview = item.status === "confirmed" && passed;
  const status = replaced
    ? "Rescheduled"
    : doctorUnavailable
      ? "Doctor unavailable"
      : expired
        ? "Request expired"
        : item.status === "no_show"
          ? "Missed appointment"
          : inProgress
            ? "Consultation in progress"
            : item.status === "confirmed" && checkedIn
              ? "Waiting for doctor"
              : needsReview
                ? "Appointment time passed"
                : item.status === "confirmed"
                  ? "Confirmed"
                  : item.status.charAt(0).toUpperCase() +
                    item.status.slice(1).replaceAll("_", " ");

  const terminal = [
    "completed",
    "in_consultation",
    "cancelled",
    "rejected",
  ].includes(item.status);
  const canReschedule =
    !replaced &&
    !inProgress &&
    item.status !== "completed" &&
    (!terminal || doctorUnavailable || expired) &&
    (r?.can_manage ||
      doctorUnavailable ||
      (r?.reschedule_count ?? 0) < (r?.max_self_reschedules ?? 1));
  const pendingRequest = r?.request?.status === "pending";
  return {
    patientStatus: status,
    staffStatus: needsReview
      ? "Needs review"
      : item.status === "no_show"
        ? "Patient no-show"
        : status,
    message:
      needsReview && !checkedIn
        ? "Attendance awaiting confirmation."
        : checkedIn && !inProgress
          ? "You are checked in. Keep your place in the queue."
          : expired
            ? "This request was not accepted in time. Choose a new appointment."
            : "",
    needsReview,
    canReschedule: Boolean(canReschedule && !pendingRequest),
    requiresApproval:
      !r?.can_manage &&
      !doctorUnavailable &&
      (item.status === "no_show" ||
        (item.status === "confirmed" &&
          started - (r?.reschedule_cutoff_minutes ?? 0) * 60000 <= now)),
    canCancel:
      ["pending", "confirmed"].includes(item.status) &&
      started > now &&
      !expired,
    canJoin:
      item.visit_mode === "online" &&
      (inProgress || (item.status === "confirmed" && !passed)),
    canShowQr:
      item.visit_mode === "clinic" &&
      item.status === "confirmed" &&
      item.queue_state === "awaiting_arrival" &&
      !passed &&
      new Intl.DateTimeFormat("en-CA", { timeZone: item.timezone }).format(
        new Date(item.starts_at)
      ) ===
        new Intl.DateTimeFormat("en-CA", { timeZone: item.timezone }).format(
          new Date(now)
        ),
    canShowQueue: item.visit_mode === "clinic" && (checkedIn || inProgress),
    canMarkNoShow: Boolean(r?.can_manage && needsReview),
    canMarkDoctorUnavailable: Boolean(
      r?.can_manage && item.status === "confirmed"
    ),
    canReview:
      !replaced &&
      !pendingRequest &&
      !inProgress &&
      item.status !== "completed" &&
      (needsReview || item.status === "no_show" || doctorUnavailable),
    bookAgain: expired || item.status === "no_show" || doctorUnavailable,
  };
}
