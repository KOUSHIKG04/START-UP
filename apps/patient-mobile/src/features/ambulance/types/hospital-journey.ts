import type {
  ActiveAmbulanceTracking,
  MyAmbulanceBooking,
} from "@startup/contracts";
export type HospitalJourneyProps = {
  emergency: boolean;
  onEmergencyChange: (value: boolean) => void;
  onProceedToPayment?: () => void;
  booking: MyAmbulanceBooking;
  location: ActiveAmbulanceTracking | null;
};
