import type {
  DoctorScheduleSettings,
  DoctorSchedulePreferences,
} from "@startup/contracts";
export function settingsDraft(
  saved: DoctorSchedulePreferences
): DoctorScheduleSettings {
  return {
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
    autoAccept: saved.auto_accept,
    autoAcceptLimit: saved.auto_accept_limit,
    homeVisits: saved.home_visits,
    homeRadiusKm: saved.home_radius_km,
    onlineFeeMinor: saved.online_fee_minor,
    clinicFeeMinor: saved.clinic_fee_minor,
    homeFeeMinor: saved.home_fee_minor,
  };
}
export const initialSettings: DoctorScheduleSettings = {
  workingDays: [1, 2, 3, 4, 5],
  onlineWorkingDays: [1, 2, 3, 4, 5],
  homeWorkingDays: [1, 2, 3, 4, 5],
  clinicStart: "09:00",
  clinicEnd: "17:00",
  onlineStart: "13:00",
  onlineEnd: "15:00",
  homeStart: "16:00",
  homeEnd: "17:00",
  slotMinutes: 15,
  onlineSlotMinutes: 30,
  homeSlotMinutes: 60,
  onlineDailyLimit: 0,
  walkinDailyLimit: 0,
  autoAccept: false,
  autoAcceptLimit: 0,
  homeVisits: false,
  homeRadiusKm: null,
  onlineFeeMinor: null,
  clinicFeeMinor: 0,
  homeFeeMinor: null,
};
export const card =
  "rounded-2xl border border-[#e2e8f0] bg-white p-6 space-y-5";
export const unavailableServiceOptions = [
  ["all", "All"],
  ["online", "Online"],
  ["clinic", "Clinic"],
  ["home", "Home"],
] as const;
