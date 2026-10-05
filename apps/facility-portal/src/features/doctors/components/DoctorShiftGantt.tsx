import * as React from "react";
import {
  scheduleTabs,
  scheduleTimeLabels,
  shiftStyles,
} from "../utils/doctorSchedulesConstants";
import type { DeptSchedule } from "../types/doctorSchedules";

export function DoctorShiftGantt({
  activeTab,
  onTabChange,
  departments,
}: {
  activeTab: (typeof scheduleTabs)[number];
  onTabChange: (tab: (typeof scheduleTabs)[number]) => void;
  departments: DeptSchedule[];
}) {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#e2e8f0]">
        <div>
          <h2 className="text-[18px] font-bold text-[#0f172a]">
            Doctor Shift Schedule
          </h2>
          <p className="text-[13px] text-[#475569] mt-0.5">
            Department-wise shift allocation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#f1f5f9] p-1 rounded-lg border border-[#e2e8f0]">
            {scheduleTabs
              .filter((tab) => tab === "Today")
              .map((tab) => (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer ${
                    activeTab === tab
                      ? "bg-[#0f172a] text-white shadow-xs"
                      : "text-[#64748b] hover:text-[#0f172a]"
                  }`}
                >
                  {tab}
                </button>
              ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[12px] text-[#475569]">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#10b981]" /> On Duty
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#ef4444]" /> Surgery
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#f59e0b]" /> On Call
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Table Grid */}
      <div className="overflow-x-auto mt-4">
        <div className="min-w-[800px]">
          {/* Time Columns Header */}
          <div className="grid grid-cols-7 border-b border-[#e2e8f0] py-2.5 text-[12px] font-semibold text-[#64748b]">
            <div className="pl-4 font-bold text-[#0f172a]">Department</div>
            {scheduleTimeLabels.map((time) => (
              <div key={time} className="text-center">
                {time}
              </div>
            ))}
          </div>

          {/* Department Rows */}
          <div className="divide-y divide-[#e2e8f0]">
            {departments.map((dept) => (
              <div
                key={dept.department}
                className="grid grid-cols-7 items-center py-3 min-h-[52px] hover:bg-slate-50/50 transition-colors"
              >
                <div className="pl-4 font-semibold text-[#0f172a] text-[13px]">
                  {dept.department}
                </div>

                {/* 6 Time Columns relative container */}
                <div className="col-span-6 grid grid-cols-6 gap-1 relative h-10 items-center px-1">
                  {dept.shifts.map((shift) => {
                    const bgStyle = shiftStyles[shift.type];

                    return (
                      <div
                        key={`${shift.doctor}-${shift.time}`}
                        style={{
                          gridColumnStart: shift.startCol,
                          gridColumnEnd: `span ${shift.spanCols}`,
                        }}
                        className={`h-9 px-2.5 py-1 rounded-md flex flex-col justify-center leading-tight text-[11px] font-semibold shadow-2xs ${bgStyle}`}
                      >
                        <span className="font-bold truncate">
                          {shift.doctor}
                        </span>
                        <span className="text-[10px] opacity-80">
                          {shift.time}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {departments.length === 0 && <p className="px-4 py-5 text-[13px] text-[#64748b]">No published doctor shifts today.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
