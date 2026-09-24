/** Canonical persisted states; attendance and queue state remain separate. */
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_consultation"
  | "completed"
  | "rejected"
  | "cancelled"
  | "no_show";
export type AppointmentSource =
  "patient_online" | "reception_walk_in" | "staff_booking" | "offline_sync";
export type QueueState =
  | "awaiting_arrival"
  | "waiting"
  | "called"
  | "in_service"
  | "held"
  | "completed"
  | "cancelled"
  | "no_show";

/** UI-supported fulfilment; schema and runtime command implementation still required. */
export type VisitMode = "clinic" | "online" | "home";

/** Proposed reservation contract. No caller-supplied actor, fee, status or queue position. */
export interface ReserveAppointmentInput {
  patientId: string;
  practiceServiceId: string;
  windowId: string;
  reason: string;
  idempotencyKey: string;
}
export interface AppointmentProjection {
  id: string;
  reference: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  rowVersion: string;
  patientId: string;
  practiceServiceId: string;
  windowId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  feeMinor: string;
  currency: string;
  queue: {
    ticketNumber: number;
    state: QueueState;
    peopleAhead: number | null;
  } | null;
}
