import type { BookSlotsProps } from "./doctor-profile";
import type { useBookSlots } from "../hooks/useBookSlots";

export type Props = Pick<
  ReturnType<typeof useBookSlots>,
  "patientId" | "setPatientId"
> &
  Pick<BookSlotsProps, "patientOptions">;
