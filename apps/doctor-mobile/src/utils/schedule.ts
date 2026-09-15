import type { Schedule } from "../types/doctor";
export function minutes(value: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
export function formatTime(value: number) {
  const hour = Math.floor(value / 60);
  return `${String(hour % 12 || 12).padStart(2, "0")}:${String(value % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}
export function scheduleError(schedule: Schedule): string | undefined {
  if (!schedule.days.length) return "Select at least one working day.";
  if (
    !Number.isFinite(minutes(schedule.start)) ||
    !Number.isFinite(minutes(schedule.end))
  )
    return "Enter clinic hours in 24-hour HH:MM format.";
  if (minutes(schedule.end) <= minutes(schedule.start))
    return "End time must be after start time.";
  if (minutes(schedule.end) - minutes(schedule.start) < schedule.duration)
    return "Clinic hours must fit at least one appointment slot.";
  if (
    [schedule.onlineFee, schedule.clinicFee, schedule.homeFee].some(
      (f) => !/^\d+(\.\d{1,2})?$/.test(f) || Number(f) > 100000
    )
  )
    return "Enter valid charges between ₹0 and ₹100,000.";
}
export function previewSlots(schedule: Schedule): string[] {
  if (
    !Number.isFinite(minutes(schedule.start)) ||
    !Number.isFinite(minutes(schedule.end)) ||
    schedule.duration < 10
  )
    return [];
  const result: string[] = [];
  for (
    let time = minutes(schedule.start);
    time + schedule.duration <= minutes(schedule.end);
    time += schedule.duration
  )
    result.push(formatTime(time));
  return result;
}
