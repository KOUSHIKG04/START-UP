export type TrackingStage = "tracking" | "arrived" | "hospital";

export type AmbulanceBookingScreenProps = {
  onBackPress: () => void;
  onComplete: () => void;
  onFullscreenChange?: (fullscreen: boolean) => void;
};

export type AmbulanceFlowStep =
  | "booking"
  | "pickup"
  | "assigning"
  | "tracking"
  | "arrived"
  | "hospital"
  | "payment"
  | "complete";

export type AmbulanceType = {
  id: "basic" | "advanced" | "icu";
  title: string;
  description: string;
  fare: number | null;
  eta: string | null;
};
