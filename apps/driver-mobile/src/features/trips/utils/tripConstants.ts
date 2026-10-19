import type {
  MyDriverTrip,
  TransitionDriverTripInput,
} from "@startup/contracts";
export const tripStageLabels: Record<
  Exclude<MyDriverTrip["status"], "cancelled">,
  string
> = {
  heading_to_pickup: "Navigate to Patient",
  arrived_at_pickup: "At Pickup Location",
  in_progress: "Trip in Progress",
  arrived_at_destination: "At Destination",
  completed: "Trip Complete",
};

export const tripNextActions: Partial<
  Record<
    MyDriverTrip["status"],
    { action: TransitionDriverTripInput["action"]; label: string }
  >
> = {
  heading_to_pickup: {
    action: "arrive_pickup",
    label: "I’ve arrived at pickup",
  },
  arrived_at_pickup: { action: "start", label: "Start trip" },
  in_progress: {
    action: "arrive_destination",
    label: "I’ve arrived at destination",
  },
};
