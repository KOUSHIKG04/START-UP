"use client";
import type { FacilityDoctorRequestsProps } from "../types/facilityDoctorRequests";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  decideMyFacilityDoctorRequest,
  listMyFacilityDoctorRequests,
} from "@startup/data-access";
import { useFacilityDoctorRequestEvents } from "./useFacilityDoctorRequestEvents";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toast } from "@startup/web-ui/components/ui/toast";
export function useFacilityDoctorRequests({
  onChange,
  scope,
}: FacilityDoctorRequestsProps) {
  useFacilityDoctorRequestEvents(scope);
  const queryClient = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const requests = useQuery({
    queryKey: ["facility-doctor-requests", scope],
    queryFn: () => listMyFacilityDoctorRequests(createBrowserSupabaseClient()),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
  useEffect(() => {
    if (requests.isError)
      toast.add({
        title: "Could not load doctor requests",
        description: "Refresh and try again.",
        type: "error",
      });
  }, [requests.isError]);
  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      decideMyFacilityDoctorRequest(
        createBrowserSupabaseClient(),
        id,
        approve,
        reasons[id]
      ),
    onSuccess: async () => {
      toast.add({ title: "Doctor request updated", type: "success" });
      await queryClient.invalidateQueries({
        queryKey: ["facility-doctor-requests"],
      });
      onChange?.();
    },
    onError: (error) =>
      toast.add({
        title: "Could not update doctor request",
        description: error.message,
        type: "error",
      }),
  });
  const pending =
    requests.data?.filter(
      (item) => item.status === "pending" && item.initiated_by === "doctor"
    ) ?? [];
  const invited =
    requests.data?.filter(
      (item) => item.status === "pending" && item.initiated_by === "facility"
    ) ?? [];

  return { reasons, setReasons, requests, decide, pending, invited };
}
