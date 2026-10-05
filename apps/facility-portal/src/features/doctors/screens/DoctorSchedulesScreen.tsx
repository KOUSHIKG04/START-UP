"use client";

import * as React from "react";
import {
  scheduleTabs,
} from "../utils/doctorSchedulesConstants";
import { formatDisplayDate, type FacilityDoctorRosterItem } from "@startup/contracts";
import { facilitySchedule, type PracticeSession } from "../utils/facilitySchedule";
import { Bell, Calendar } from "lucide-react";
import { DoctorSchedulesStats } from "../components/DoctorSchedulesStats";
import { DoctorShiftGantt } from "../components/DoctorShiftGantt";
import { DoctorAssignmentsTable } from "../components/DoctorAssignmentsTable";

export default function DoctorSchedulesScreen({ doctors, sessions, loadError }: { doctors: FacilityDoctorRosterItem[]; sessions: PracticeSession[]; loadError?: string }) {
  const [activeTab, setActiveTab] =
    React.useState<(typeof scheduleTabs)[number]>("Today");
  const schedule = facilitySchedule(doctors, sessions);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {loadError && <p role="alert" className="text-[13px] text-red-700">{loadError}</p>}
      {/* TopBar (Figma 840:56) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#0f172a] tracking-tight">
            Doctor Schedules
          </h1>
          <p className="text-[13px] text-[#475569] mt-0.5">
            Manage, monitor, and optimize physical rosters and on-duty rotations
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Bell Button */}
          <button
            aria-label="Notifications"
            className="size-9 rounded-lg bg-white border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            <Bell className="size-4" />
          </button>

          {/* Date Badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg shadow-xs">
            <Calendar className="size-4 text-[#475569] shrink-0" />
            <span
              suppressHydrationWarning
              className="text-[13px] font-semibold text-[#475569] whitespace-nowrap"
            >
              {formatDisplayDate(new Date(), "Asia/Kolkata")}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <DoctorSchedulesStats scheduleSummary={schedule.summary} />

      {/* Doctor Shift Schedule Gantt Card */}
      <DoctorShiftGantt activeTab={activeTab} onTabChange={setActiveTab} departments={schedule.departments} />

      {/* Today's Doctor Assignments */}
      <DoctorAssignmentsTable assignments={schedule.assignments} />
    </div>
  );
}
