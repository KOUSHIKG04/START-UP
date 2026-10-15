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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Appointments */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">
              Total Appointments
            </p>
            <h3 className="mt-2 text-[28px] leading-none font-bold text-[#0f172a]">
              {summary.total}
            </h3>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eff6ff] text-blue-600">
            <CalendarDays className="size-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#475569]">
          <span className="size-2 shrink-0 rounded-full bg-blue-600" />
          <span>Today&apos;s total schedule</span>
        </div>
      </div>

      {/* Confirmed Today */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">
              Confirmed Today
            </p>
            <h3 className="mt-2 text-[28px] leading-none font-bold text-[#0f172a]">
              {summary.confirmed}
            </h3>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f0fdf4] text-emerald-600">
            <Check className="size-5 stroke-[2.5]" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#475569]">
          <span className="size-2 shrink-0 rounded-full bg-[#22c55e]" />
          <span>Ready for consultation</span>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">
              Pending Requests
            </p>
            <h3 className="mt-2 text-[28px] leading-none font-bold text-[#0f172a]">
              {summary.pending}
            </h3>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#fff7ed] text-orange-500">
            <Clock className="size-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#475569]">
          <span className="size-2 shrink-0 rounded-full bg-[#f97316]" />
          <span>Awaiting administrative approval</span>
        </div>
      </div>

      {/* Cancelled */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">Cancelled</p>
            <h3 className="mt-2 text-[28px] leading-none font-bold text-[#0f172a]">
              {summary.cancelled}
            </h3>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#fef2f2] text-red-500">
            <XCircle className="size-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#475569]">
          <span className="size-2 shrink-0 rounded-full bg-[#ef4444]" />
          <span>Rescheduled or revoked</span>
        </div>
      </div>
    </div>
  );
}
