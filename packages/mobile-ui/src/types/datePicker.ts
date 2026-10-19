import type { CalendarProps } from "./calendar";

export type DatePickerProps = CalendarProps & {
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
};
