export type AmbulanceBookingStatus =
  | "awaiting_location"
  | "searching"
  | "assigned"
  | "fulfilled"
  | "cancelled"
  | "unfulfilled";
export type DispatchOfferStatus =
  "pending" | "accepted" | "rejected" | "expired" | "withdrawn";
export type TripStatus =
  | "heading_to_pickup"
  | "arrived_at_pickup"
  | "in_progress"
  | "arrived_at_destination"
  | "completed"
  | "cancelled";
export type TripStartAuthorization = "driver_confirmed" | "emergency_override";
