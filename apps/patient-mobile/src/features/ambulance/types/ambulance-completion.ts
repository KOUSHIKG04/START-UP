import type { MyAmbulanceBooking } from "@startup/contracts";

export type AmbulanceCompletionProps = {
  onGoHome: () => void;
  booking: MyAmbulanceBooking;
  onSubmitRating: (rating: number) => Promise<void>;
};
