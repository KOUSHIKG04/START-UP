import type { ActiveAmbulanceTracking } from "@startup/contracts";

import type { TrackingStage } from "./ambulance";
import type { MyAmbulanceBooking } from "@startup/contracts";

export type TrackingProps = {
  stage: TrackingStage;
  emergency: boolean;
  onEmergencyChange: (value: boolean) => void;
  onCancel: () => void;
  onProceedToPayment?: () => void;
  booking: MyAmbulanceBooking;
  location: ActiveAmbulanceTracking | null;
  completionPin: string | null;
};

export type DriverCardProps = {
  name: string;
  vehicle: string | null;
  service: string;
  rating: string | null;
};

export type PinRowProps = { pin: string | null };

export type TripControlsProps = {
  location: ActiveAmbulanceTracking | null;
};
