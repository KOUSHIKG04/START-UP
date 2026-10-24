import type { useBookSlots } from "../hooks/useBookSlots";

export type Props = Pick<
  ReturnType<typeof useBookSlots>,
  | "today"
  | "selectedMonthOffset"
  | "selectedDate"
  | "monthOptions"
  | "monthDates"
  | "datesScrollRef"
  | "monthsScrollRef"
  | "handleSelectMonth"
  | "handleSelectDate"
>;
