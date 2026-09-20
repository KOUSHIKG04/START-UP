"use client";

import * as React from "react";
import {
  deptSchedules,
  todayAssignments,
  scheduleTabs,
  scheduleDateLabel,
  scheduleSummary,
  scheduleTimeLabels,
  shiftStyles,
} from "../utils/doctorSchedulesConstants";
import {
  Bell,
  Calendar,
  Contact,
  Check,
  Activity,
  AlertTriangle,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@startup/web-ui/components/ui/avatar";

export default function DoctorSchedulesScreen() {
  const [activeTab, setActiveTab] =
    React.useState<(typeof scheduleTabs)[number]>("Today");

  return (
    <div className="flex flex-col gap-6 pb-12">
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
          <button className="size-9 rounded-lg bg-white border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:bg-slate-50 transition-colors shadow-xs cursor-pointer">
            <Bell className="size-4" />
          </button>

          {/* Date Badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg shadow-xs">
            <Calendar className="size-4 text-[#475569] shrink-0" />
            <span className="text-[13px] font-semibold text-[#475569] whitespace-nowrap">
              {scheduleDateLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Row (Figma 840:68) */}
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

      {/* Doctor Shift Schedule Gantt Card (Figma 840:108) */}
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
              {scheduleTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
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
              {deptSchedules.map((dept) => (
                <div
                  key={dept.department}
                  className="grid grid-cols-7 items-center py-3 min-h-[52px] hover:bg-slate-50/50 transition-colors"
                >
                  <div className="pl-4 font-semibold text-[#0f172a] text-[13px]">
                    {dept.department}
                  </div>

                  {/* 6 Time Columns relative container */}
                  <div className="col-span-6 grid grid-cols-6 gap-1 relative h-10 items-center px-1">
                    {dept.shifts.map((shift, idx) => {
                      // Styling based on shift type
                      const bgStyle = shiftStyles[shift.type];

                      return (
                        <div
                          key={idx}
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
            </div>
          </div>
        </div>
      </div>

      {/* Today's Doctor Assignments (Figma 840:248) */}
      <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-xs">
        <div className="pb-4 border-b border-[#e2e8f0]">
          <h2 className="text-[18px] font-bold text-[#0f172a]">
            Today&apos;s Doctor Assignments
          </h2>
          <p className="text-[13px] text-[#475569] mt-0.5">
            Current active shifts and operational status
          </p>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-[13px] border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-[#e2e8f0] text-[#64748b] text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Doctor Name</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Shift Time</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {todayAssignments.map((doc) => (
                <tr
                  key={doc.name}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  {/* Doctor Name with Avatar */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3 font-semibold text-[#0f172a]">
                      <Avatar className="size-8 rounded-full border border-slate-200">
                        <AvatarImage src={doc.avatar} alt={doc.name} />
                        <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-semibold">
                          {doc.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{doc.name}</span>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="py-3.5 px-3 text-[#475569] font-medium">
                    {doc.department}
                  </td>

                  {/* Shift Time */}
                  <td className="py-3.5 px-3 text-[#0f172a] font-medium">
                    {doc.shiftTime}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-3">
                    {doc.status === "In Surgery" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold bg-[#fee2e2] text-[#ef4444]">
                        In Surgery
                      </span>
                    )}
                    {doc.status === "On Duty" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold bg-[#ecfdf5] text-[#10b981]">
                        On Duty
                      </span>
                    )}
                    {doc.status === "On Call" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold bg-[#fffbeb] text-[#f59e0b]">
                        On Call
                      </span>
                    )}
                  </td>

                  {/* Contact */}
                  <td className="py-3.5 px-3 text-[#475569] font-medium">
                    {doc.contact}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-3 text-right">
                    <button className="text-[13px] font-semibold text-[#3b82f6] hover:underline cursor-pointer">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
