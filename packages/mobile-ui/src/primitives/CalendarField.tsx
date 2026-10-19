import { DatePicker } from "./DatePicker";
import type { CalendarFieldProps } from "../types/calendarField";
export type { CalendarFieldProps } from "../types/calendarField";

export function CalendarField(props: CalendarFieldProps) {
  return <DatePicker {...props} />;
}
