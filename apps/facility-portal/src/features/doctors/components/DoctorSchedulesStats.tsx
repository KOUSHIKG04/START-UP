import * as React from "react";
import { Contact, Check, Activity, AlertTriangle } from "lucide-react";

export function DoctorSchedulesStats({
  scheduleSummary,
}: {
  scheduleSummary: {
    total: number;
    available: number;
    surgery: number | null;
    emergency: number | null;
  };
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Doctors */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <p className="text-[14px] font-medium text-[#475569]">
            Total Doctors
          </p>
          <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Contact className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-[28px] leading-none font-bold text-[#0f172a]">
            {scheduleSummary.total}
          </h3>
          <span className="text-[12px] text-[#64748b]">On roster today</span>
        </div>
      </div>

      {/* Available Now */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <p className="text-[14px] font-medium text-[#475569]">
            Available Now
          </p>
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#10b981]">
            <Check className="size-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-[28px] leading-none font-bold text-[#0f172a]">
            {scheduleSummary.available}
          </h3>
          <span className="text-[12px] font-medium text-[#10b981]">
            Ready for walk-ins
          </span>
        </div>
      </div>

      {/* In Surgery */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <p className="text-[14px] font-medium text-[#475569]">In Surgery</p>
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#fef2f2] text-[#ef4444]">
            <Activity className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-[28px] leading-none font-bold text-[#0f172a]">
            {scheduleSummary.surgery ?? "—"}
          </h3>
          <span className="text-[12px] font-medium text-[#ef4444]">
            {scheduleSummary.surgery === null
              ? "Not tracked"
              : "Active operations"}
          </span>
        </div>
      </div>

      {/* On Emergency Duty */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <p className="text-[14px] font-medium text-[#475569]">
            On Emergency Duty
          </p>
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#fffbeb] text-[#f59e0b]">
            <AlertTriangle className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-[28px] leading-none font-bold text-[#f59e0b]">
            {scheduleSummary.emergency ?? "—"}
          </h3>
          <span className="text-[12px] text-[#64748b]">
            {scheduleSummary.emergency === null
              ? "Not tracked"
              : "On-call / Trauma"}
          </span>
        </div>
      </div>
    </div>
  );
}
