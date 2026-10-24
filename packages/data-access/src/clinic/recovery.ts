import {
  appointmentReviewSchema,
  attendanceOutcomeSchema,
  recoveryDecisionSchema,
  recoveryPolicySchema,
  recoveryResultSchema,
  rescheduleAppointmentSchema,
  clinicSlotSchema,
  doctorSchedulePreferencesSchema,
  uuidSchema,
} from "@startup/contracts";
import type {
  AppointmentReviewInput,
  AttendanceOutcomeInput,
  RecoveryDecisionInput,
  RecoveryPolicyInput,
  RescheduleAppointmentInput,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function listAppointmentRescheduleOptions(
  client: AppSupabaseClient,
  appointmentId: string
) {
  const { data, error } = await client.rpc(
    "list_appointment_reschedule_options",
    { p_appointment_id: uuidSchema.parse(appointmentId) }
  );
  if (error) throw error;
  return clinicSlotSchema.array().parse(data);
}

export async function rescheduleAppointment(
  client: AppSupabaseClient,
  input: RescheduleAppointmentInput
) {
  const r = rescheduleAppointmentSchema.parse(input);
  const { data, error } = await client.rpc("reschedule_appointment", {
    p_appointment_id: r.appointmentId,
    p_expected_version: r.expectedVersion,
    p_target_window_id: r.targetWindowId,
    p_reason: r.reason,
    p_idempotency_key: r.idempotencyKey,
  });
  if (error) throw error;
  return recoveryResultSchema.parse(data);
}

export async function requestAppointmentReview(
  client: AppSupabaseClient,
  input: AppointmentReviewInput
) {
  const r = appointmentReviewSchema.parse(input);
  const { data, error } = await client.rpc("request_appointment_review", {
    p_appointment_id: r.appointmentId,
    p_expected_version: r.expectedVersion,
    p_reason: r.reason,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function resolveAppointmentAttendance(
  client: AppSupabaseClient,
  input: AttendanceOutcomeInput
) {
  const r = attendanceOutcomeSchema.parse(input);
  const { data, error } = await client.rpc("resolve_appointment_attendance", {
    p_appointment_id: r.appointmentId,
    p_expected_version: r.expectedVersion,
    p_outcome: r.outcome,
    p_note: r.note,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function decideAppointmentRecovery(
  client: AppSupabaseClient,
  input: RecoveryDecisionInput
) {
  const r = recoveryDecisionSchema.parse(input);
  const { data, error } = await client.rpc("decide_appointment_recovery", {
    p_request_id: r.requestId,
    p_expected_version: r.expectedVersion,
    p_approve: r.approve,
    p_note: r.note,
  });
  if (error) throw error;
  return recoveryResultSchema.parse(data);
}

export async function setAppointmentRecoveryPolicy(
  client: AppSupabaseClient,
  input: RecoveryPolicyInput
) {
  const r = recoveryPolicySchema.parse(input);
  const { data, error } = await client.rpc("set_appointment_recovery_policy", {
    p_practice_id: r.practiceId,
    p_expected_version: r.expectedVersion,
    p_online_grace_minutes: r.onlineGraceMinutes,
    p_reschedule_cutoff_minutes: r.rescheduleCutoffMinutes,
    p_max_self_reschedules: r.maxSelfReschedules,
  });
  if (error) throw error;
  return doctorSchedulePreferencesSchema.parse(data);
}
