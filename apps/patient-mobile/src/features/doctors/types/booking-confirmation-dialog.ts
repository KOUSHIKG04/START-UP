import type { useDoctorBooking } from "../hooks/useDoctorBooking";

export type Props = Pick<
  ReturnType<typeof useDoctorBooking>,
  | "confirmation"
  | "setOpeningConfirmation"
  | "setConfirmation"
  | "book"
  | "practiceId"
  | "serviceMode"
  | "slots"
  | "bookingOptions"
  | "acceptedPolicy"
  | "setAcceptedPolicy"
>;
