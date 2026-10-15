"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "@startup/web-ui/components/ui/toast";
import {
  formatDisplayDate,
  type FacilityDoctorRosterItem,
} from "@startup/contracts";
import {
  facilityDayKey,
  facilitySchedule,
  type PracticeSession,
} from "../utils/facilitySchedule";
import { Bell, Calendar } from "lucide-react";
import { DoctorSchedulesStats } from "../components/DoctorSchedulesStats";
import { DoctorShiftGantt } from "../components/DoctorShiftGantt";
import { DoctorAssignmentsTable } from "../components/DoctorAssignmentsTable";

export default function DoctorSchedulesScreen({
  doctors,
  sessions,
  loadError,
}: {
  doctors: FacilityDoctorRosterItem[];
  sessions: PracticeSession[];
  loadError?: string;
}) {
  React.useEffect(() => {
    if (loadError)
      toast.add({
        title: "Could not load doctor schedules",
        description: loadError,
        type: "error",
      });
  }, [loadError]);
  const [selectedDay, setSelectedDay] = React.useState(() =>
    facilityDayKey(new Date())
  );
  const router = useRouter();
  const schedule = facilitySchedule(doctors, sessions, new Date(), selectedDay);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* TopBar (Figma 840:56) */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#0f172a]">
            Doctor Schedules
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            aria-label="Manage doctor schedule"
            className="h-9 max-w-64 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm"
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
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#475569] shadow-xs transition-colors hover:bg-slate-50"
          >
            <Bell className="size-4" />
          </button>

          {/* Date Badge */}
          <div className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 shadow-xs">
            <Calendar className="size-4 shrink-0 text-[#475569]" />
            <span
              suppressHydrationWarning
              className="text-[13px] font-semibold whitespace-nowrap text-[#475569]"
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
