"use client";

import { useDashboardDoctorRequests } from "../hooks/useDashboardDoctorRequests";

import type { DashboardDoctorRequestsProps } from "../types/dashboardDoctorRequests";

import Link from "next/link";

import { Skeleton } from "@startup/web-ui/components/ui/skeleton";

export function DashboardDoctorRequests({
  scope,
  initialRequests,
}: DashboardDoctorRequestsProps) {
  const { requests, pending } = useDashboardDoctorRequests({
    scope,
    initialRequests,
  });
  if (requests.isLoading)
    return (
      <div aria-label="Loading doctor requests">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  if (!pending.length) return null;
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-[13px] font-semibold text-[#475569]">
          Doctor associations ({pending.length})
        </h4>
        <Link
          href="/doctor-management#doctor-association-requests"
          className="text-[13px] font-semibold text-[#07595d] hover:underline"
        >
          View all
        </Link>
      </div>
      {pending.slice(0, 3).map((request) => (
        <div
          key={request.id}
          className="rounded-xl border border-[#e2e8f0] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-[14px] font-bold text-[#0f172a]">
                {request.doctor_name}
              </h4>
              <p className="mt-1 text-[12px] text-[#475569]">
                Requested association with {request.facility_name}
              </p>
            </div>
            <span className="rounded-md bg-[#fff7ed] px-2.5 py-1 text-[11px] font-semibold text-[#9a3412]">
              Pending
            </span>
          </div>
          <div className="mt-3 flex justify-end">
            <Link
              href="/doctor-management#doctor-association-requests"
              className="text-[13px] font-semibold text-[#07595d] hover:underline"
            >
              Review request
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
