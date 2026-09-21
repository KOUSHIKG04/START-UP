import type { ReactNode } from "react";
import {
  Search,
  Calendar,
  CalendarDays,
  Clock,
  ChevronRight,
  Check,
} from "lucide-react";
import { Button } from "@startup/web-ui/components/ui/button";

import {
  wards,
  doctors,
  dashboardDateLabel,
  dashboardCapacityLabel,
  scheduleDays,
  pendingRequests,
} from "../utils/dashboardConstants";

export default function DashboardScreen({
  doctorAction,
}: {
  doctorAction: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* TopBar (Figma 809:48) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#0f172a] tracking-tight">
            Hospital Dashboard
          </h1>
          <p className="text-[13px] text-[#475569] mt-0.5">
            Real-time administrative operations overview
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg w-64 shadow-xs">
            <Search className="size-4 text-[#94a3b8] shrink-0" />
            <input
              type="text"
              aria-label="Search patient, doctor..."
              placeholder="Search patient, doctor..."
              className="bg-transparent text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none w-full"
            />
          </div>

          {/* Date Badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg shadow-xs">
            <Calendar className="size-4 text-[#475569] shrink-0" />
            <span className="text-[13px] font-semibold text-[#475569] whitespace-nowrap">
              {dashboardDateLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Bed Availability Section (Figma 809:59) */}
      <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-[18px] font-bold text-[#0f172a]">
              Bed Availability by Type
            </h2>
            <p className="text-[13px] text-[#475569] mt-0.5">
              Availability &amp; occupancy metrics across specialized wards
            </p>
          </div>
          <div className="inline-flex items-center px-3 py-1.5 bg-[#e6f4f5] rounded-lg self-start sm:self-auto">
            <span className="text-[11px] font-semibold text-[#07595d] tracking-wide uppercase">
              {dashboardCapacityLabel}
            </span>
          </div>
        </div>

        {/* 8 Bed Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {wards.map((ward) => {
            const Icon = ward.icon;
            return (
              <div
                key={ward.name}
                className="bg-white border border-[#e2e8f0] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#0f172a] leading-tight">
                      {ward.name}
                    </h3>
                    <span className="text-[11px] text-[#94a3b8]">
                      Total: {ward.total}
                    </span>
                  </div>
                  <div
                    className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${ward.iconBg} ${ward.iconColor}`}
                  >
                    <Icon className="size-[18px]" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#475569]">
                      Available{" "}
                      <strong className="text-[#0f172a] font-bold">
                        {ward.available}
                      </strong>{" "}
                      • Occupied{" "}
                      <strong className="text-[#0f172a] font-bold">
                        {ward.occupied}
                      </strong>
                    </span>
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${ward.iconBg} ${ward.iconColor}`}
                    >
                      {ward.percent}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#f1f5f9] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ward.progressColor}`}
                      style={{ width: `${ward.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Doctor Action (Figma 809:321) */}
      <div>{doctorAction}</div>

      {/* Lower Split Layout (Figma 809:181) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Doctor Weekly Schedule (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-xs flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="size-5 text-[#07595d]" />
                <h3 className="text-[18px] font-bold text-[#0f172a]">
                  Doctor Weekly Schedule
                </h3>
              </div>
              <button className="text-[13px] font-semibold text-[#07595d] hover:underline cursor-pointer">
                View All
              </button>
            </div>

            {/* Schedule Table */}
            <div className="overflow-x-auto">
              <div className="min-w-[540px]">
                {/* Header Row */}
                <div className="bg-[#f8fafc] rounded-md px-4 py-2 flex items-center text-[#475569] text-[11px] font-bold mb-1">
                  <div className="w-[180px] shrink-0">Doctor / Speciality</div>
                  <div className="flex-1 flex justify-between text-center px-4">
                    {scheduleDays.map((day) => (
                      <span key={day} className="w-8">
                        {day}
                      </span>
                    ))}
                  </div>
                  <div className="w-8 shrink-0" />
                </div>

                {/* Doctor Rows */}
                <div className="divide-y divide-[#e2e8f0]">
                  {doctors.map((doc) => (
                    <div
                      key={doc.name}
                      className="px-4 py-3 flex items-center hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-[180px] shrink-0 leading-tight">
                        <p className="text-[14px] font-semibold text-[#0f172a]">
                          {doc.name}
                        </p>
                        <p className="text-[12px] text-[#475569]">
                          {doc.speciality}
                        </p>
                      </div>

                      <div className="flex-1 flex justify-between items-center px-4">
                        {doc.days.map((isAvail, idx) => (
                          <div
                            key={idx}
                            className="w-8 flex justify-center items-center"
                          >
                            <span
                              className={`size-2 rounded-full ${
                                isAvail ? "bg-[#22c55e]" : "bg-[#ef4444]"
                              }`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="w-8 shrink-0 flex justify-end">
                        <ChevronRight className="size-4 text-[#94a3b8]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Pending Appointment Requests (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-xs flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Clock className="size-5 text-[#07595d]" />
                <h3 className="text-[18px] font-bold text-[#0f172a]">
                  Pending Requests
                </h3>
              </div>
              <button className="text-[13px] font-semibold text-[#07595d] hover:underline cursor-pointer">
                View All
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Request 1 */}
              <div className="border border-[#e2e8f0] rounded-xl p-4 bg-white shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-[14px] font-bold text-[#0f172a]">
                      {pendingRequests[0].patient}
                    </h4>
                    <p className="text-[12px] text-[#475569]">
                      {pendingRequests[0].consultation}
                    </p>
                  </div>
                  <span className="bg-[#eff6ff] text-[#3b82f6] text-[11px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap">
                    {pendingRequests[0].time}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-[#94a3b8]">
                    {pendingRequests[0].requested}
                  </span>
                </div>
              </div>

              {/* Request 2 with Accept Action */}
              <div className="border border-[#e2e8f0] rounded-xl p-4 bg-white shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-[14px] font-bold text-[#0f172a]">
                      {pendingRequests[1].patient}
                    </h4>
                    <p className="text-[12px] text-[#475569]">
                      {pendingRequests[1].consultation}
                    </p>
                  </div>
                  <span className="bg-[#f0fdf4] text-[#16a34a] text-[11px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap">
                    {pendingRequests[1].time}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-[#94a3b8]">
                    {pendingRequests[1].requested}
                  </span>
                  <Button
                    size="sm"
                    className="bg-[#07595d] hover:bg-[#064e52] text-white text-[12px] font-bold px-3 py-1.5 h-auto rounded-lg flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Accept</span>
                    <Check className="size-3.5 stroke-[2.5]" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
