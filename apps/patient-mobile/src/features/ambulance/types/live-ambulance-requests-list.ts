import type { MyAmbulanceBooking } from "@startup/contracts";

export type LiveAmbulanceRequestsListProps = {
  bookings?: MyAmbulanceBooking[];
  isLoading: boolean;
  error: unknown;
  onRefresh: () => void;
  activeBookingId?: string;
  trackingData?: {
    latitude: number;
    longitude: number;
    received_at: string;
  } | null;
  pinVisible: boolean;
  isPinLoading: boolean;
  pinData?: string | null;
  isRefreshPending: boolean;
  onRefreshDispatch: (bookingId: string) => void;
  isCancelPending: boolean;
  onCancel: (booking: MyAmbulanceBooking) => void;
};
