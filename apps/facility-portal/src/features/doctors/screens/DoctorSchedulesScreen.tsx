"use client";

import { useDoctorSchedules } from "../hooks/useDoctorSchedules";

import type { DoctorSchedulesScreenProps } from "../types/doctorSchedulesScreen";

import { formatDisplayDate } from "@startup/contracts";

import { Bell, Calendar } from "lucide-react";
import { DoctorSchedulesStats } from "../components/DoctorSchedulesStats";
import { DoctorShiftGantt } from "../components/DoctorShiftGantt";
import { DoctorAssignmentsTable } from "../components/DoctorAssignmentsTable";

export default function DoctorSchedulesScreen({
  doctors,
  sessions,
  loadError,
}: DoctorSchedulesScreenProps) {
  const { selectedDay, setSelectedDay, router, schedule } = useDoctorSchedules({
    doctors,
    sessions,
    loadError,
  });
  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* TopBar (Figma 840:56) */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Doctor Schedules
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            aria-label="Manage doctor schedule"
            className="border-border bg-card h-9 max-w-64 rounded-lg border px-3 text-sm"
            value=""
            onChange={(event) => {
              if (event.target.value)
                router.push(`/doctor-schedules/${event.target.value}`);
            }}
          >
            <option value="">Manage doctor schedule</option>
            {doctors
              .filter((doctor) => doctor.verified)
              .map((doctor) => (
                <option key={doctor.practice_id} value={doctor.practice_id}>
                  {doctor.name}
                </option>
              ))}
          </select>
          {/* Bell Button */}
          <button
            aria-label="Notifications"
            className="border-border bg-card text-muted-foreground hover:bg-muted flex size-9 cursor-pointer items-center justify-center rounded-lg border shadow-xs transition-colors"
          >
            <Bell className="size-4" />
          </button>

          {/* Date Badge */}
          <div className="border-border bg-card flex items-center gap-2 rounded-lg border px-3 py-2 shadow-xs">
            <Calendar className="text-muted-foreground size-4 shrink-0" />
            <span
              suppressHydrationWarning
              className="text-muted-foreground text-sm font-semibold whitespace-nowrap"
            >
              {formatDisplayDate(new Date(), "Asia/Kolkata")}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <DoctorSchedulesStats scheduleSummary={schedule.summary} />

      {/* Doctor Shift Schedule Gantt Card */}
      <DoctorShiftGantt
        selectedDay={selectedDay}
        onDayChange={setSelectedDay}
        nextScheduledDay={schedule.nextScheduledDay}
        departments={schedule.departments}
      />

      {/* Assignments for the selected date */}
      <DoctorAssignmentsTable
        assignments={schedule.assignments}
        selectedDay={selectedDay}
      />
    </div>
  );
}
