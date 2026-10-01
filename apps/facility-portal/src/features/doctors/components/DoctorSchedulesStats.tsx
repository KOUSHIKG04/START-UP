import * as React from "react";
import { Contact, Check, Activity, AlertTriangle } from "lucide-react";
import { scheduleSummary } from "../utils/doctorSchedulesConstants";

export function DoctorSchedulesStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Doctors */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between">
          <p className="text-[14px] font-medium text-[#475569]">
            Total Doctors
          </p>
          <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Contact className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-[28px] font-bold text-[#0f172a] leading-none">
            {scheduleSummary.total}
          </h3>
          <span className="text-[12px] text-[#64748b]">On roster today</span>
        </div>
      </div>

      {/* Available Now */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between">
          <p className="text-[14px] font-medium text-[#475569]">
            Available Now
          </p>
          <div className="size-8 rounded-lg bg-[#ecfdf5] flex items-center justify-center text-[#10b981]">
            <Check className="size-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-[28px] font-bold text-[#0f172a] leading-none">
            {scheduleSummary.available}
          </h3>
          <span className="text-[12px] text-[#10b981] font-medium">
            Ready for walk-ins
          </span>
        </div>
      </div>

      {/* In Surgery */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between">
          <p className="text-[14px] font-medium text-[#475569]">In Surgery</p>
          <div className="size-8 rounded-lg bg-[#fef2f2] flex items-center justify-center text-[#ef4444]">
            <Activity className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-[28px] font-bold text-[#0f172a] leading-none">
            {scheduleSummary.surgery}
          </h3>
          <span className="text-[12px] text-[#ef4444] font-medium">
            Active operations
          </span>
        </div>
      </div>

      {/* On Emergency Duty */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between">
          <p className="text-[14px] font-medium text-[#475569]">
            On Emergency Duty
          </p>
          <div className="size-8 rounded-lg bg-[#fffbeb] flex items-center justify-center text-[#f59e0b]">
            <AlertTriangle className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-[28px] font-bold text-[#f59e0b] leading-none">
            {scheduleSummary.emergency}
          </h3>
          <span className="text-[12px] text-[#64748b]">On-call / Trauma</span>
        </div>
      </div>
    </div>
  );
}
