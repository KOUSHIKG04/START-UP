import {
  doctorSchedulePreferencesSchema,
  doctorScheduleSettingsSchema,
  uuidSchema,
} from "@startup/contracts";
import type { DoctorScheduleSettings } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function getMyDoctorPresence(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("get_my_doctor_presence");
  if (error) throw error;
  return Boolean(data);
}

export async function setMyDoctorPresence(
  client: AppSupabaseClient,
  present: boolean
) {
  const { data, error } = await client.rpc("set_my_doctor_presence", {
    p_present: present,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function getMySchedulePreferences(
  client: AppSupabaseClient,
  practiceId: string
) {
  const { data, error } = await client.rpc("get_my_schedule_preferences", {
    p_practice_id: uuidSchema.parse(practiceId),
  });
  if (error) throw error;
  return data === null ? null : doctorSchedulePreferencesSchema.parse(data);
}

export async function saveMySchedulePreferences(
  client: AppSupabaseClient,
  practiceId: string,
  settings: DoctorScheduleSettings,
  expectedVersion: number
) {
  const value = doctorScheduleSettingsSchema.parse(settings);
  const { data, error } = await client.rpc("save_my_schedule_preferences", {
    p_practice_id: uuidSchema.parse(practiceId),
    p_settings: {
      working_days: value.workingDays,
      clinic_start: value.clinicStart,
      clinic_end: value.clinicEnd,
      slot_minutes: value.slotMinutes,
      online_slot_minutes: value.onlineSlotMinutes,
      home_slot_minutes: value.homeSlotMinutes,
      online_daily_limit: value.onlineDailyLimit,
      walkin_daily_limit: value.walkinDailyLimit,
      auto_accept: value.autoAccept,
      auto_accept_limit: value.autoAcceptLimit,
      home_visits: value.homeVisits,
      home_radius_km: value.homeRadiusKm,
      online_fee_minor: value.onlineFeeMinor,
      clinic_fee_minor: value.clinicFeeMinor,
      home_fee_minor: value.homeFeeMinor,
    },
    p_expected_version: expectedVersion,
  });

  if (error) throw error;

  return doctorSchedulePreferencesSchema.parse(data);
}
