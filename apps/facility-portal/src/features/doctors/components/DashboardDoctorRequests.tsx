"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listMyFacilityDoctorRequests } from "@startup/data-access";
import type { FacilityDoctorRequest } from "@startup/contracts";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Skeleton } from "@startup/web-ui/components/ui/skeleton";
import { toast } from "@startup/web-ui/components/ui/toast";
import { useFacilityDoctorRequestEvents } from "../hooks/useFacilityDoctorRequestEvents";
import { incomingDoctorRequests } from "../utils/incomingDoctorRequests";

export function DashboardDoctorRequests({ scope, initialRequests }: { scope: string; initialRequests?: FacilityDoctorRequest[] }) {
  useFacilityDoctorRequestEvents(scope);
  const seen = useRef(new Set(incomingDoctorRequests(initialRequests ?? []).map(request => request.id)));
  const requests = useQuery({ queryKey: ["facility-doctor-requests", scope],
    queryFn: () => listMyFacilityDoctorRequests(createBrowserSupabaseClient()), initialData: initialRequests,
    staleTime: Infinity, refetchOnWindowFocus: false, refetchOnReconnect: false, refetchOnMount: false });
  const pending = incomingDoctorRequests(requests.data ?? []);
  useEffect(() => {
    if (!requests.data) return;
    const incoming = incomingDoctorRequests(requests.data).filter(request => !seen.current.has(request.id));
    seen.current = new Set(incomingDoctorRequests(requests.data).map(request => request.id));
    if (incoming.length) toast.add({ title: incoming.length === 1 ? "New doctor association request" : `${incoming.length} new doctor association requests`,
      description: incoming.length === 1 ? `${incoming[0].doctor_name} requested to join ${incoming[0].facility_name}.` : "Review the requests in Doctor Management.", type: "info" });
  }, [requests.data]);
  useEffect(() => { if (requests.isError) toast.add({ title: "Could not load doctor requests", description: "Refresh and try again.", type: "error" }); }, [requests.isError]);
  if (requests.isLoading) return <div aria-label="Loading doctor requests"><Skeleton className="h-24 w-full" /></div>;
  if (!pending.length) return null;
  return <div className="space-y-3.5">
    <div className="flex items-center justify-between gap-3"><h4 className="text-[13px] font-semibold text-[#475569]">Doctor associations ({pending.length})</h4>
      <Link href="/doctor-management#doctor-association-requests" className="text-[13px] font-semibold text-[#07595d] hover:underline">View all</Link></div>
    {pending.slice(0, 3).map(request => <div key={request.id} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h4 className="text-[14px] font-bold text-[#0f172a]">{request.doctor_name}</h4>
        <p className="mt-1 text-[12px] text-[#475569]">Requested association with {request.facility_name}</p></div>
        <span className="rounded-md bg-[#fff7ed] px-2.5 py-1 text-[11px] font-semibold text-[#9a3412]">Pending</span></div>
      <div className="mt-3 flex justify-end"><Link href="/doctor-management#doctor-association-requests" className="text-[13px] font-semibold text-[#07595d] hover:underline">Review request</Link></div>
    </div>)}
  </div>;
}
