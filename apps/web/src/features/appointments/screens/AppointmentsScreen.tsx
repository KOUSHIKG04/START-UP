"use client";

import * as React from "react";
import {
  Search,
  Calendar,
  ChevronDown,
  Plus,
  Clock,
  Check,
  XCircle,
  CalendarDays,
  User,
  Video,
  MoreVertical,
  X,
} from "lucide-react";
import { Button } from "@startup/web-ui/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@startup/web-ui/components/ui/avatar";

import type { AppointmentPeriod } from "../types/appointments";
import {
  appointmentsData,
  appointmentPeriods,
  defaultAppointmentPeriod,
  appointmentsSummary,
  appointmentsDateLabel,
  bookingDateLabel,
  appointmentsPagination,
} from "../utils/appointmentsConstants";

export default function AppointmentsScreen() {
  const [filterPeriod, setFilterPeriod] = React.useState<AppointmentPeriod>(
    defaultAppointmentPeriod,
  );

  const displayedAppointments = React.useMemo(() => {
    if (filterPeriod === "All") return appointmentsData;
    return appointmentsData.filter((item) => item.period === filterPeriod);
  }, [filterPeriod]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* TopBar (Figma 815:56) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#0f172a] tracking-tight">
            Appointments
          </h1>
          <p className="text-[13px] text-[#475569] mt-0.5">
            Manage and schedule patient visits across departments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg w-56 shadow-xs">
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
              {appointmentsDateLabel}
            </span>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg shadow-xs cursor-pointer">
            <span className="text-[13px] text-[#0f172a]">
              Status: <strong className="font-bold">All</strong>
            </span>
            <ChevronDown className="size-3.5 text-[#475569]" />
          </div>

          {/* New Appointment Button */}
          <Button className="bg-[#07595d] hover:bg-[#064e52] text-white text-[13px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors">
            <Plus className="size-4 stroke-[2.5]" />
            <span>New Appointment</span>
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards Row (Figma 815:75) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Appointments */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#475569]">
                Total Appointments
              </p>
              <h3 className="text-[28px] font-bold text-[#0f172a] leading-none mt-2">
                {appointmentsSummary.total}
              </h3>
            </div>
            <div className="size-10 rounded-lg bg-[#eff6ff] flex items-center justify-center text-blue-600 shrink-0">
              <CalendarDays className="size-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#475569]">
            <span className="size-2 rounded-full bg-blue-600 shrink-0" />
            <span>Today&apos;s total schedule</span>
          </div>
        </div>

        {/* Confirmed Today */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#475569]">
                Confirmed Today
              </p>
              <h3 className="text-[28px] font-bold text-[#0f172a] leading-none mt-2">
                {appointmentsSummary.confirmed}
              </h3>
            </div>
            <div className="size-10 rounded-lg bg-[#f0fdf4] flex items-center justify-center text-emerald-600 shrink-0">
              <Check className="size-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#475569]">
            <span className="size-2 rounded-full bg-[#22c55e] shrink-0" />
            <span>Ready for consultation</span>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#475569]">
                Pending Requests
              </p>
              <h3 className="text-[28px] font-bold text-[#0f172a] leading-none mt-2">
                {appointmentsSummary.pending}
              </h3>
            </div>
            <div className="size-10 rounded-lg bg-[#fff7ed] flex items-center justify-center text-orange-500 shrink-0">
              <Clock className="size-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#475569]">
            <span className="size-2 rounded-full bg-[#f97316] shrink-0" />
            <span>Awaiting administrative approval</span>
          </div>
        </div>

        {/* Cancelled */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#475569]">
                Cancelled
              </p>
              <h3 className="text-[28px] font-bold text-[#0f172a] leading-none mt-2">
                {appointmentsSummary.cancelled}
              </h3>
            </div>
            <div className="size-10 rounded-lg bg-[#fef2f2] flex items-center justify-center text-red-500 shrink-0">
              <XCircle className="size-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#475569]">
            <span className="size-2 rounded-full bg-[#ef4444] shrink-0" />
            <span>Rescheduled or revoked</span>
          </div>
        </div>
      </div>

      {/* Recent Bookings Card & Table (Figma 815:87) */}
      <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-xs">
        {/* Card Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#e2e8f0]">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-bold text-[#0f172a]">
                Recent Bookings
              </h2>
              <span className="bg-[#e6f4f5] text-[#07595d] text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                {displayedAppointments.length} APPOINTMENTS VISIBLE
              </span>
            </div>
            <p className="text-[13px] text-[#475569] mt-0.5">
              Check-in status and edit requests for all scheduled slots
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Selector */}
            <div className="flex items-center gap-2 px-3 py-1.5 border border-[#e2e8f0] rounded-lg bg-white shadow-2xs cursor-pointer">
              <Calendar className="size-4 text-[#475569]" />
              <span className="text-[13px] font-medium text-[#0f172a]">
                {bookingDateLabel}
              </span>
              <ChevronDown className="size-3.5 text-[#475569]" />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#f8fafc] p-1 rounded-lg border border-[#e2e8f0]">
              {appointmentPeriods.map((period) => (
                <button
                  key={period}
                  onClick={() => setFilterPeriod(period)}
                  className={`px-3 py-1 rounded-md text-[13px] font-semibold transition-colors cursor-pointer ${
                    filterPeriod === period
                      ? "bg-[#e6f4f5] text-[#07595d]"
                      : "text-[#475569] hover:text-[#0f172a]"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-[13px] border-collapse min-w-[960px]">
            <thead>
              <tr className="border-b border-[#e2e8f0] text-[#475569] text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Que No.</th>
                <th className="py-3 px-3">Patient ID</th>
                <th className="py-3 px-3">Patient Name</th>
                <th className="py-3 px-3">Doctor / Department</th>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {displayedAppointments.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  {/* Que No */}
                  <td className="py-3.5 px-3 font-semibold text-[#0f172a]">
                    {row.queueNo}
                  </td>

                  {/* Patient ID */}
                  <td className="py-3.5 px-3 font-semibold text-[#07595d]">
                    {row.patientId}
                  </td>

                  {/* Patient Name with Avatar */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8 rounded-full border border-slate-200">
                        <AvatarImage
                          src={row.patientAvatar}
                          alt={row.patientName}
                        />
                        <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-semibold">
                          {row.patientName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-[#0f172a]">
                        {row.patientName}
                      </span>
                    </div>
                  </td>

                  {/* Doctor & Department */}
                  <td className="py-3.5 px-3">
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold text-[#0f172a]">
                        {row.doctorName}
                      </span>
                      <span className="text-[11px] text-[#475569]">
                        {row.department}
                      </span>
                    </div>
                  </td>

                  {/* Time */}
                  <td className="py-3.5 px-3 text-[#0f172a] font-medium">
                    {row.time}
                  </td>

                  {/* Mode */}
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#f1f5f9] text-[#334155]">
                      {row.mode === "In-Person" ? (
                        <User className="size-3.5 text-[#64748b]" />
                      ) : (
                        <Video className="size-3.5 text-blue-500" />
                      )}
                      {row.mode}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-3">
                    {row.status === "Pending" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#fff7ed] text-[#f97316]">
                        <span className="size-1.5 rounded-full bg-[#f97316]" />
                        Pending
                      </span>
                    )}
                    {row.status === "Confirmed" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#eff6ff] text-blue-600">
                        <span className="size-1.5 rounded-full bg-blue-600" />
                        Confirmed
                      </span>
                    )}
                    {row.status === "Rejected" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#fef2f2] text-red-600">
                        <span className="size-1.5 rounded-full bg-red-600" />
                        Rejected
                      </span>
                    )}
                    {row.status === "Cancelled" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#fef2f2] text-red-600">
                        <span className="size-1.5 rounded-full bg-red-600" />
                        Cancelled
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {row.status === "Pending" && (
                        <>
                          <button className="bg-[#22c55e] hover:bg-[#16a34a] text-white text-[12px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-2xs cursor-pointer transition-colors">
                            <Check className="size-3.5 stroke-[2.5]" />
                            <span>Accept</span>
                          </button>
                          <button className="bg-[#ef4444] hover:bg-[#dc2626] text-white text-[12px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-2xs cursor-pointer transition-colors">
                            <X className="size-3.5 stroke-[2.5]" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                      <button
                        aria-label="More actions"
                        className="p-1 hover:bg-slate-100 rounded text-[#94a3b8] hover:text-[#0f172a] cursor-pointer transition-colors"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination (Figma 815:202) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 pt-4 border-t border-[#e2e8f0] text-[13px] text-[#475569]">
          <p>
            Showing{" "}
            <strong className="font-semibold text-[#0f172a]">
              {appointmentsPagination.range}
            </strong>{" "}
            of{" "}
            <strong className="font-semibold text-[#0f172a]">
              {appointmentsPagination.total}
            </strong>{" "}
            results
          </p>

          <div className="flex items-center gap-1 self-center">
            <button className="px-2.5 py-1.5 border border-[#e2e8f0] rounded-md text-[#475569] hover:bg-slate-50 text-[12px] font-medium cursor-pointer">
              Previous
            </button>
            <button className="size-8 rounded-md bg-[#07595d] text-white text-[12px] font-bold flex items-center justify-center">
              {appointmentsPagination.currentPage}
            </button>
            <button className="size-8 rounded-md hover:bg-slate-50 text-[#475569] text-[12px] font-medium flex items-center justify-center cursor-pointer">
              {appointmentsPagination.nextPages[0]}
            </button>
            <button className="size-8 rounded-md hover:bg-slate-50 text-[#475569] text-[12px] font-medium flex items-center justify-center cursor-pointer">
              {appointmentsPagination.nextPages[1]}
            </button>
            <span className="px-1 text-slate-400">...</span>
            <button className="size-8 rounded-md hover:bg-slate-50 text-[#475569] text-[12px] font-medium flex items-center justify-center cursor-pointer">
              {appointmentsPagination.lastPage}
            </button>
            <button className="px-2.5 py-1.5 border border-[#e2e8f0] rounded-md text-[#475569] hover:bg-slate-50 text-[12px] font-medium cursor-pointer">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
