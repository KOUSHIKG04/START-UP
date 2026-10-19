"use client";
import type { DashboardDoctorRequestsProps } from "../types/dashboardDoctorRequests";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listMyFacilityDoctorRequests } from "@startup/data-access";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "@startup/web-ui/components/ui/toast";
import { useFacilityDoctorRequestEvents } from "./useFacilityDoctorRequestEvents";
import { incomingDoctorRequests } from "../utils/incomingDoctorRequests";
export function useDashboardDoctorRequests({
  scope,
  initialRequests,
}: DashboardDoctorRequestsProps) {
  useFacilityDoctorRequestEvents(scope);
  const seen = useRef(
    new Set(
      incomingDoctorRequests(initialRequests ?? []).map((request) => request.id)
    )
  );
  const requests = useQuery({
    queryKey: ["facility-doctor-requests", scope],
    queryFn: () => listMyFacilityDoctorRequests(createBrowserSupabaseClient()),
    initialData: initialRequests,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
  const pending = incomingDoctorRequests(requests.data ?? []);
  useEffect(() => {
    if (!requests.data) return;
    const incoming = incomingDoctorRequests(requests.data).filter(
      (request) => !seen.current.has(request.id)
    );
    seen.current = new Set(
      incomingDoctorRequests(requests.data).map((request) => request.id)
    );
    if (incoming.length)
      toast.add({
        title:
          incoming.length === 1
            ? "New doctor association request"
            : `${incoming.length} new doctor association requests`,
        description:
          incoming.length === 1
            ? `${incoming[0].doctor_name} requested to join ${incoming[0].facility_name}.`
            : "Review the requests in Doctor Management.",
        type: "info",
      });
  }, [requests.data]);
  useEffect(() => {
    if (requests.isError)
      toast.add({
        title: "Could not load doctor requests",
        description: "Refresh and try again.",
        type: "error",
      });
  }, [requests.isError]);

  return { requests, pending };
}
