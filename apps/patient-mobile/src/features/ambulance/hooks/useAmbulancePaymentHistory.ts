import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyAmbulanceBookings } from "@startup/data-access";
import { supabase } from "../../../services/supabase";

export function useAmbulancePaymentHistory(bookingId?: string) {
  const client = useQueryClient();
  const bookings = useQuery({
    queryKey: ["my-ambulance-bookings"],
    queryFn: () => listMyAmbulanceBookings(supabase!),
    enabled: Boolean(supabase && !bookingId),
  });
  return {
    refresh: () =>
      bookingId
        ? client.refetchQueries(
            { queryKey: ["ambulance-billing", bookingId], type: "active" },
            { throwOnError: true }
          )
        : bookings.refetch({ throwOnError: true }),
    bookings,
    completed:
      bookings.data?.filter((b) => b.trip_status === "completed") ?? [],
  };
}
