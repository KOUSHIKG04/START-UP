import type { EarningsScreenProps } from "../types/earnings-screen";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { listMyDriverTrips, listPayoutEntries } from "@startup/data-access";
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
  const payouts = useInfiniteQuery({
    queryKey: ["driver-payouts", profile?.driver?.id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPayoutEntries(supabase!, { beforeId: pageParam }),
    getNextPageParam: (last) =>
      last.length === 100 ? last.at(-1)?.id : undefined,
    enabled: Boolean(supabase && profile?.driver?.id && !history),
    refetchInterval: 30000,
  });

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

  return {
    refresh: () => [
      trips.refetch({ throwOnError: true }),
      ...(!history ? [payouts.refetch({ throwOnError: true })] : []),
    ],
    trips,
    period,
    setPeriod,
    filtered,
    payouts,
    payoutEntries:
      payouts.data?.pages
        .flat()
        .filter((e) => new Date(e.created_at).getTime() >= start.getTime()) ??
      [],
  };
}
