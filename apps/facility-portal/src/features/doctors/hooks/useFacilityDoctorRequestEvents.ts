"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "@startup/web-ui/components/ui/toast";

export function useFacilityDoctorRequestEvents(scope: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!scope) return;
    const client = createBrowserSupabaseClient();
    const channels: RealtimeChannel[] = [];
    let active = true;
    let warned = false;
    let queued = false;
    const refresh = () => {
      if (!active || queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (active) void queryClient.invalidateQueries({ queryKey: ["facility-doctor-requests"] });
      });
    };
    const reportFailure = () => {
      if (!active || warned) return;
      warned = true;
      toast.add({ title: "Live doctor request updates unavailable", description: "Refresh the page to check the latest requests.", type: "error" });
    };
    async function connect() {
      await client.realtime.setAuth();
      if (!active) return;
      for (const facilityId of scope.split(":")) {
        const channel = client.channel(`facility-associations:${facilityId}`, { config: { private: true } })
          .on("broadcast", { event: "doctor_association_changed" }, refresh)
          .subscribe(status => {
            // One catch-up read after joining/rejoining closes the initial-load/offline gap.
            if (status === "SUBSCRIBED") { warned = false; refresh(); }
            else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reportFailure();
          });
        channels.push(channel);
      }
    }
    void connect().catch(reportFailure);
    return () => {
      active = false;
      for (const channel of channels) void client.removeChannel(channel).catch(() => undefined);
    };
  }, [queryClient, scope]);
}
