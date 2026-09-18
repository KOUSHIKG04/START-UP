export type TrackingStage = "tracking" | "arrived" | "hospital";

export type AmbulanceBookingScreenProps = {
  onBackPress: () => void;
  onComplete: () => void;
  onFullscreenChange?: (fullscreen: boolean) => void;
};
