import type {
  loadPortalWalkInPractices,
  loadPortalWalkInSlots,
} from "../server/actions";
export type Practice = Awaited<
  ReturnType<typeof loadPortalWalkInPractices>
>[number];

export type Slot = Awaited<ReturnType<typeof loadPortalWalkInSlots>>[number];

export type NewAppointmentDialogProps = { onCreated: () => void };
