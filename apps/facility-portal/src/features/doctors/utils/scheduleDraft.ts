import type {
  DoctorScheduleSettings,
  DoctorSchedulePreferences,
} from "@startup/contracts";

export function settingsDraft(
  saved: DoctorSchedulePreferences
): DoctorScheduleSettings {
  return {
    clinicTimeBlocks: saved.clinic_time_blocks ?? [
      {
        start: saved.clinic_start.slice(0, 5),
        end: saved.clinic_end.slice(0, 5),
      },
    ],
    onlineTimeBlocks: saved.online_time_blocks ?? [
      {
        start: saved.online_start?.slice(0, 5) ?? "13:00",
        end: saved.online_end?.slice(0, 5) ?? "15:00",
      },
    ],
    homeTimeBlocks: saved.home_time_blocks ?? [
      {
        start: saved.home_start?.slice(0, 5) ?? "16:00",
        end: saved.home_end?.slice(0, 5) ?? "17:00",
      },
    ],
    homeTravelBufferMinutes: saved.home_travel_buffer_minutes ?? 0,
    workingDays: saved.working_days,
    onlineWorkingDays: saved.online_working_days ?? saved.working_days,
    homeWorkingDays: saved.home_working_days ?? saved.working_days,
    clinicStart: saved.clinic_start.slice(0, 5),
    clinicEnd: saved.clinic_end.slice(0, 5),
    onlineStart: saved.online_start?.slice(0, 5) ?? "13:00",
    onlineEnd: saved.online_end?.slice(0, 5) ?? "15:00",
    homeStart: saved.home_start?.slice(0, 5) ?? "16:00",
    homeEnd: saved.home_end?.slice(0, 5) ?? "17:00",
    slotMinutes: saved.slot_minutes,
    onlineSlotMinutes: saved.online_slot_minutes,
    homeSlotMinutes: saved.home_slot_minutes,
    onlineDailyLimit: saved.online_daily_limit,
    walkinDailyLimit: saved.walkin_daily_limit,
    clinicAppDailyLimit:
      saved.clinic_app_daily_limit ?? saved.walkin_daily_limit,
    clinicWalkinDailyLimit: saved.clinic_walkin_daily_limit ?? 0,
    autoAccept: saved.auto_accept,
    autoAcceptLimit: saved.auto_accept_limit,
    homeVisits: saved.home_visits,
    homeRadiusKm: saved.home_radius_km,
    onlineFeeMinor: saved.online_fee_minor ?? 0,
    clinicFeeMinor: saved.clinic_fee_minor,
    homeFeeMinor: saved.home_fee_minor ?? 0,
  };
}
