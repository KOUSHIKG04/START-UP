import * as React from "react";
import { CalendarDays, Check, Clock, XCircle } from "lucide-react";

export interface AppointmentsSummaryData {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
}

export function AppointmentsSummaryCards({
  summary,
}: {
  summary: AppointmentsSummaryData;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Appointments */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">
              Total Appointments
            </p>
            <h3 className="text-[28px] font-bold text-[#0f172a] leading-none mt-2">
              {summary.total}
            </h3>
          </div>
          <div className="size-10 rounded-lg bg-[#eff6ff] flex items-center justify-center text-blue-600 shrink-0">
            <CalendarDays className="size-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#475569]">
          <span className="size-2 rounded-full bg-blue-600 shrink-0" />
          <span>Today&apos;s total schedule</span>
        </div>
      </div>

      {/* Confirmed Today */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">
              Confirmed Today
            </p>
            <h3 className="text-[28px] font-bold text-[#0f172a] leading-none mt-2">
              {summary.confirmed}
            </h3>
          </div>
          <div className="size-10 rounded-lg bg-[#f0fdf4] flex items-center justify-center text-emerald-600 shrink-0">
            <Check className="size-5 stroke-[2.5]" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#475569]">
          <span className="size-2 rounded-full bg-[#22c55e] shrink-0" />
          <span>Ready for consultation</span>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">
              Pending Requests
            </p>
            <h3 className="text-[28px] font-bold text-[#0f172a] leading-none mt-2">
              {summary.pending}
            </h3>
          </div>
          <div className="size-10 rounded-lg bg-[#fff7ed] flex items-center justify-center text-orange-500 shrink-0">
            <Clock className="size-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#475569]">
          <span className="size-2 rounded-full bg-[#f97316] shrink-0" />
          <span>Awaiting administrative approval</span>
        </div>
      </div>

      {/* Cancelled */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">
              Cancelled
            </p>
            <h3 className="text-[28px] font-bold text-[#0f172a] leading-none mt-2">
              {summary.cancelled}
            </h3>
          </div>
          <div className="size-10 rounded-lg bg-[#fef2f2] flex items-center justify-center text-red-500 shrink-0">
            <XCircle className="size-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#475569]">
          <span className="size-2 rounded-full bg-[#ef4444] shrink-0" />
          <span>Rescheduled or revoked</span>
        </div>
      </div>
    </div>
  );
}
