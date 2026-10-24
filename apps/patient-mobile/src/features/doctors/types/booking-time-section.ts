import type { BookSlotsProps } from "./doctor-profile";
import type { useBookSlots } from "../hooks/useBookSlots";

export type Props = Pick<
  ReturnType<typeof useBookSlots>,
  "selectedTime" | "setSelectedTime" | "selectedDate" | "dateSlots"
> &
  Pick<BookSlotsProps, "loading" | "error" | "timeZone">;
