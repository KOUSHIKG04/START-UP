import type { EarningsScreenProps } from "../types/earnings-screen";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listMyDriverTrips } from "@startup/data-access";
import { useToastFeedback } from "@startup/mobile-ui";
import { supabase, useMobileSession } from "../../../services/supabase";
export function useDriverEarnings({ history = false }: EarningsScreenProps) {
  const { profile } = useMobileSession();

  const trips = useQuery({
    queryKey: ["my-driver-trips", profile?.driver?.id],
    queryFn: () => listMyDriverTrips(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
  });
  useToastFeedback({
    error: trips.isError ? "Could not load trip history." : "",
  });

  const [period, setPeriod] = useState("Today");

  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "This Week")
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  if (period === "This Month") start.setDate(1);
  const filtered =
    trips.data?.filter(
      (t) =>
        t.status === "completed" &&
        t.completed_at &&
        new Date(t.completed_at).getTime() >= start.getTime()
    ) ?? [];

  return { trips, period, setPeriod, filtered };
}
