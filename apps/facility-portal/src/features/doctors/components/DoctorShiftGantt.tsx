import type { DoctorShiftGanttProps } from "../types/doctorShiftGantt";

import {
  scheduleTimeLabels,
  shiftStyles,
} from "../utils/doctorSchedulesConstants";
import { facilityDayKey } from "../utils/facilitySchedule";

export function DoctorShiftGantt({
  selectedDay,
  onDayChange,
  nextScheduledDay,
  departments,
}: DoctorShiftGanttProps) {
  const today = facilityDayKey(new Date());
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
  return (
    <div className="border-border bg-card rounded-lg border p-6 shadow-xs">
      <div className="border-border flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-foreground text-lg font-bold">
            Doctor Shift Schedule
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Department-wise shift allocation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Date selection */}
          <div className="border-border bg-muted flex items-center gap-1 rounded-lg border p-1">
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
                className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedDay === day
                    ? "bg-foreground text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
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
            className="border-border bg-card text-foreground h-9 rounded-lg border px-2 text-sm"
          />

          {/* Legend */}
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-primary size-2 rounded-full" /> On Duty
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-destructive size-2 rounded-full" /> Surgery
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-muted-foreground size-2 rounded-full" /> On
              Call
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-primary size-2 rounded-full" /> Home Visit
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Table Grid */}
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Time Columns Header */}
          <div className="border-border text-muted-foreground grid grid-cols-7 border-b py-2.5 text-xs font-semibold">
            <div className="text-foreground pl-4 font-bold">Department</div>
            {scheduleTimeLabels.map((time) => (
              <div key={time} className="text-center">
                {time}
              </div>
            ))}
          </div>

          {/* Department Rows */}
          <div className="divide-border divide-y">
            {departments.map((dept) => (
              <div
                key={dept.department}
                className="hover:bg-muted/50 grid min-h-[52px] grid-cols-7 items-center py-3 transition-colors"
              >
                <div className="text-foreground pl-4 text-sm font-semibold">
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
                        className={`flex h-9 flex-col justify-center rounded-md px-2.5 py-1 text-xs leading-tight font-semibold shadow-2xs ${bgStyle}`}
                      >
                        <span className="truncate font-bold">
                          {shift.doctor}
                        </span>
                        <span className="text-xs opacity-80">{shift.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {departments.length === 0 && (
              <div className="text-muted-foreground px-4 py-5 text-sm">
                <p>No published doctor shifts for {selectedDay}.</p>
                {nextScheduledDay && selectedDay < nextScheduledDay ? (
                  <button
                    type="button"
                    onClick={() => onDayChange(nextScheduledDay)}
                    className="text-primary mt-2 font-medium underline"
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
