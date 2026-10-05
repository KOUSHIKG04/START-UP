import type { Schedule } from "../../../types/doctor";
export function minutes(value: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
/** 24:00 is only a valid exclusive end boundary, never a slot start. */
export function endMinutes(value: string): number {
  return value === "24:00" ? 24 * 60 : minutes(value);
}
export function formatTime(value: number) {
  const hour = Math.floor(value / 60);
  return `${String(hour % 12 || 12).padStart(2, "0")}:${String(value % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}
export function scheduleError(schedule: Schedule): string | undefined {
  if (!Number.isInteger(schedule.duration) || schedule.duration < 5 || schedule.duration > 120) return "Enter a clinic slot duration from 5 to 120 minutes.";
  if (!Number.isInteger(schedule.onlineDuration) || schedule.onlineDuration < 5 || schedule.onlineDuration > 120) return "Enter an online slot duration from 5 to 120 minutes.";
  if (!Number.isInteger(schedule.homeDuration) || schedule.homeDuration < 30 || schedule.homeDuration > 120) return "Enter a home-visit slot duration from 30 to 120 minutes.";
  if (![schedule.online, schedule.walkIn, schedule.autoLimit].every(value => Number.isInteger(value) && value >= 0 && value <= 100)) return "Enter daily limits from 0 to 100.";
  if (!schedule.days.length) return "Select at least one working day.";
  if (
    !Number.isFinite(minutes(schedule.start)) ||
    !Number.isFinite(endMinutes(schedule.end))
  )
    return "Enter clinic hours as HH:MM; the end may be 24:00.";
  if (endMinutes(schedule.end) <= minutes(schedule.start))
    return "End time must be after start time.";
  if (endMinutes(schedule.end) - minutes(schedule.start) < schedule.duration)
    return "Clinic hours must fit at least one appointment slot.";
  if (
    [schedule.onlineFee, schedule.clinicFee, schedule.homeFee].some(
      (f) => !/^\d+(\.\d{1,2})?$/.test(f) || Number(f) > 100000
    )
  )
    return "Enter valid charges between ₹0 and ₹100,000.";
  if (
    schedule.homeVisits &&
    (!/^\d+(\.\d{1,2})?$/.test(schedule.homeRadius) ||
      Number(schedule.homeRadius) <= 0 ||
      Number(schedule.homeRadius) > 9999.99)
  )
    return "Enter a positive home-visit travel radius in km.";
}
export function previewSlots(schedule: Schedule): string[] {
  return previewTimeBlock(schedule.start, schedule.end, schedule.duration);
}

export function previewTimeBlock(start: string, end: string, duration: number): string[] {
  return slotStartTimes(start, end, duration).map((slot) => formatTime(minutes(slot)));
}

export function slotStartTimes(start: string, end: string, duration: number): string[] {
  if (
    !Number.isFinite(minutes(start)) ||
    !Number.isFinite(endMinutes(end)) ||
    !Number.isInteger(duration) || duration < 5 || duration > 120
  )
    return [];
  const result: string[] = [];
  for (
    let time = minutes(start);
    time + duration <= endMinutes(end);
    time += duration
  )
    result.push(`${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`);
  return result;
}

export function toggleSelectedSlot(slots: string[], slot: string, limit: number): string[] {
  if (slots.includes(slot)) return slots.filter(item => item !== slot);
  if (!Number.isInteger(limit) || limit <= slots.length) return slots;
  return [...slots, slot];
}
