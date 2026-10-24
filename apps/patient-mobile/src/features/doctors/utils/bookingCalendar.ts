import { months } from "./doctorProfileConstants";
import type { BookingDate } from "../types/booking-calendar";

export function getDatesForMonth(
  monthIndex: number,
  year: number = 2026
): BookingDate[] {
  const month = months[monthIndex];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result: BookingDate[] = [];

  for (let day = 1; day <= month.days; day++) {
    const d = new Date(year, monthIndex, day);
    const dayOfWeek = dayNames[d.getDay()];
    const isSunday = d.getDay() === 0;

    let displayDay = dayOfWeek;
    if (monthIndex === 7) {
      if (day === 20) displayDay = "Today";
      else if (day === 21) displayDay = "Tomorrow";
    }

    result.push({
      key: `${day}-${month.short.toLowerCase()}`,
      day: displayDay,
      date: `${day} ${month.short}`,
      dayNumber: day,
      closed: isSunday,
    });
  }

  return result;
}

export const dates: readonly BookingDate[] = getDatesForMonth(7);
