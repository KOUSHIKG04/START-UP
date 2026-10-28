"use client";

import type { LiveFacilityUpdatesProps } from "../types/liveFacilityUpdates";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeAppChanges, type AppLiveChange } from "@startup/data-access";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "@startup/web-ui/components/ui/toast";

export function useLiveFacilityUpdates({
  facilityIds,
}: LiveFacilityUpdatesProps) {
  const scope = [...facilityIds].sort().join(":");
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const path = useRef(pathname);
  useEffect(() => {
    path.current = pathname;
  }, [pathname]);
  useEffect(() => {
    if (!scope) return;
    let active = true,
      queued = false,
      catchUp = false,
      warned = false;
    const changes = new Map<string, AppLiveChange>();
    const refresh = (change?: AppLiveChange) => {
      if (!active) return;
      if (change) changes.set(`${change.topic}:${change.kind}`, change);
      else catchUp = true;
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (!active) return;
        const all = catchUp;
        const kinds = new Set(
          [...changes.values()].map((change) => change.kind)
        );
        if (all || kinds.has("beds"))
          void queryClient.invalidateQueries(
            { queryKey: ["facility-live-beds"] },
            { cancelRefetch: false }
          );
        if (
          all ||
          kinds.has("schedule") ||
          kinds.has("profile") ||
          kinds.has("appointments")
        ) {
          void queryClient.invalidateQueries(
            { queryKey: ["facility-practice-schedule"] },
            { cancelRefetch: false }
          );
          void queryClient.invalidateQueries(
            { queryKey: ["facility-recovery-policy"] },
            { cancelRefetch: false }
          );
          void queryClient.invalidateQueries(
            { queryKey: ["appointment-billing"] },
            { cancelRefetch: false }
          );
          void queryClient.invalidateQueries(
            { queryKey: ["portal-reschedule-options"] },
            { cancelRefetch: false }
          );
          void queryClient.invalidateQueries(
            { queryKey: ["doctors", "directory"] },
            { cancelRefetch: false }
          );
        }
        // Bed Management updates its lightweight query, without reloading the page.
        if (
          (all ||
            kinds.has("appointments") ||
            kinds.has("beds") ||
            kinds.has("schedule") ||
            kinds.has("profile")) &&
          ["/", "/dashboard", "/appointments", "/doctor-schedules"].includes(
            path.current
          )
        )
          router.refresh();
        changes.clear();
        catchUp = false;
      });
    };
    const cleanup = subscribeAppChanges(
      createBrowserSupabaseClient(),
      { facilityIds: scope.split(":") },
      {
        onChange: refresh,
        onConnected: () => {
          warned = false;
          refresh();
        },
        onError: () => {
          if (active && !warned) {
            warned = true;
            toast.add({
              title: "Live updates disconnected",
              description: "Updates will catch up when the connection returns.",
              type: "info",
            });
          }
        },
      }
    );
    return () => {
      active = false;
      cleanup();
    };
  }, [scope, queryClient, router]);
}
