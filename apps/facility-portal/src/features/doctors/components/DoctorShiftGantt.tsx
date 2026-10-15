import * as React from "react";
import {
  scheduleTimeLabels,
  shiftStyles,
} from "../utils/doctorSchedulesConstants";
import { facilityDayKey } from "../utils/facilitySchedule";
import type { DeptSchedule } from "../types/doctorSchedules";

export function DoctorShiftGantt({
  selectedDay,
  onDayChange,
  nextScheduledDay,
  departments,
}: {
  selectedDay: string;
  onDayChange: (day: string) => void;
  nextScheduledDay: string | null;
  departments: DeptSchedule[];
}) {
  const today = facilityDayKey(new Date());
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
  return (
    <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-6 shadow-xs">
      <div className="flex flex-col justify-between gap-4 border-b border-[#e2e8f0] pb-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[18px] font-bold text-[#0f172a]">
            Doctor Shift Schedule
          </h2>
          <p className="mt-0.5 text-[13px] text-[#475569]">
            Department-wise shift allocation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Date selection */}
          <div className="flex items-center gap-1 rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] p-1">
            {(
              [
                ["Today", today],
                ["Tomorrow", tomorrow],
              ] as const
            ).map(([tab, day]) => (
              <button
                key={tab}
                type="button"
                onClick={() => onDayChange(day)}
                className={`cursor-pointer rounded-md px-3 py-1 text-[12px] font-semibold transition-colors ${
                  selectedDay === day
                    ? "bg-[#0f172a] text-white shadow-xs"
                    : "text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <input
            type="date"
            aria-label="Schedule date"
            value={selectedDay}
            min={today}
            onChange={(event) => {
              if (event.target.value) onDayChange(event.target.value);
            }}
            className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-2 text-sm text-[#0f172a]"
          />

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
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#7c3aed]" /> Home Visit
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Table Grid */}
      <div className="mt-4 overflow-x-auto">
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
                className="grid min-h-[52px] grid-cols-7 items-center py-3 transition-colors hover:bg-slate-50/50"
              >
                <div className="pl-4 text-[13px] font-semibold text-[#0f172a]">
                  {dept.department}
                </div>

                {/* 6 Time Columns relative container */}
                <div className="relative col-span-6 grid h-10 grid-cols-6 items-center gap-1 px-1">
                  {dept.shifts.map((shift) => {
                    const bgStyle = shiftStyles[shift.type];

                    return (
                      <div
                        key={`${shift.doctor}-${shift.time}`}
                        style={{
                          gridColumnStart: shift.startCol,
                          gridColumnEnd: `span ${shift.spanCols}`,
                        }}
                        className={`flex h-9 flex-col justify-center rounded-md px-2.5 py-1 text-[11px] leading-tight font-semibold shadow-2xs ${bgStyle}`}
                      >
                        <span className="truncate font-bold">
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
            {departments.length === 0 && (
              <div className="px-4 py-5 text-[13px] text-[#64748b]">
                <p>No published doctor shifts for {selectedDay}.</p>
                {nextScheduledDay && selectedDay < nextScheduledDay ? (
                  <button
                    type="button"
                    onClick={() => onDayChange(nextScheduledDay)}
                    className="mt-2 font-medium text-[#008577] underline"
                  >
                    View next scheduled day: {nextScheduledDay}
                  </button>
                ) : null}
                {!nextScheduledDay ? (
                  <p className="mt-2">
                    Publishing starts today in the doctor’s booking timezone.
                    Check the selected working days, remaining hours and daily
                    slot limit if no future shifts appear.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
