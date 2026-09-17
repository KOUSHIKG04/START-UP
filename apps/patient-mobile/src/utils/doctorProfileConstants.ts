export type ProfileTab = "about" | "slots";

export type BookingDate = {
  key: string;
  day: string;
  date: string;
  dayNumber: number;
  closed?: boolean;
};

export type BookingTimeSlot = {
  time: string;
  disabled: boolean;
};

export const DEFAULT_ADDRESS = "2nd Main Road, Jayanagar, Bengaluru";

export const profileTabs: readonly ProfileTab[] = ["about", "slots"] as const;

export type MonthOption = {
  name: string;
  short: string;
  index: number;
  days: number;
};

export const months: readonly MonthOption[] = [
  { name: "January", short: "Jan", index: 0, days: 31 },
  { name: "February", short: "Feb", index: 1, days: 28 },
  { name: "March", short: "Mar", index: 2, days: 31 },
  { name: "April", short: "Apr", index: 3, days: 30 },
  { name: "May", short: "May", index: 4, days: 31 },
  { name: "June", short: "Jun", index: 5, days: 30 },
  { name: "July", short: "Jul", index: 6, days: 31 },
  { name: "August", short: "Aug", index: 7, days: 31 },
  { name: "September", short: "Sep", index: 8, days: 30 },
  { name: "October", short: "Oct", index: 9, days: 31 },
  { name: "November", short: "Nov", index: 10, days: 30 },
  { name: "December", short: "Dec", index: 11, days: 31 },
] as const;

export function getDatesForMonth(monthIndex: number, year: number = 2026): BookingDate[] {
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

export const timeSlots: readonly BookingTimeSlot[] = [
  { time: "09:00 AM", disabled: true },
  { time: "09:30 AM", disabled: true },
  { time: "10:00 AM", disabled: true },
  { time: "10:30 AM", disabled: true },
  { time: "11:00 AM", disabled: true },
  { time: "11:30 AM", disabled: true },
  { time: "02:00 PM", disabled: false },
  { time: "02:30 PM", disabled: false },
  { time: "03:00 PM", disabled: false },
  { time: "03:30 PM", disabled: false },
  { time: "04:00 PM", disabled: false },
  { time: "04:30 PM", disabled: false },
  { time: "05:00 PM", disabled: false },
  { time: "05:30 PM", disabled: false },
] as const;

export const languages = ["English", "Hindi", "Kannada"] as const;

export const patientOptions = ["Self", "Family 1"] as const;
