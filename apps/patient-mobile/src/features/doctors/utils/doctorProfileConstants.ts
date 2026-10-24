import type {
  ProfileTab,
  BookingDate,
  BookingTimeSlot,
  MonthOption,
} from "../types/booking-calendar";

export type {
  ProfileTab,
  BookingDate,
  BookingTimeSlot,
  MonthOption,
} from "../types/booking-calendar";

export const DEFAULT_ADDRESS = "2nd Main Road, Jayanagar, Bengaluru";

export const profileTabs: readonly ProfileTab[] = ["about", "slots"] as const;

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
