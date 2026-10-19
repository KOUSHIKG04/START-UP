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

export type MonthOption = {
  name: string;
  short: string;
  index: number;
  days: number;
};
