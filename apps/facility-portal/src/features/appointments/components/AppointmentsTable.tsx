import * as React from "react";
import type { ClinicAppointment } from "@startup/contracts";
import {
  Calendar,
  ChevronDown,
  Check,
  X,
  User,
  Video,
  MoreVertical,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@startup/web-ui/components/ui/avatar";
import type { AppointmentPeriod } from "../types/appointments";
import { appointmentPeriods } from "../utils/appointmentsConstants";

const appointmentTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export interface AppointmentsPaginationData {
  range: string;
  total: number;
  currentPage: number;
  nextPages: number[];
  lastPage: number;
}

export function AppointmentsTable({
  pageRows,
  pending,
  onAct,
  pagination,
  onPageChange,
  displayedCount,
  filterPeriod,
  onFilterPeriodChange,
  bookingDateLabel,
}: {
  pageRows: ClinicAppointment[];
  pending: boolean;
  onAct: (item: ClinicAppointment, action: "approve" | "reject") => void;
  pagination: AppointmentsPaginationData;
  onPageChange: (page: number) => void;
  displayedCount: number;
  filterPeriod: AppointmentPeriod;
  onFilterPeriodChange: (period: AppointmentPeriod) => void;
  bookingDateLabel: string;
}) {
  return (
    <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-6 shadow-xs">
      {/* Card Header & Controls */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#e2e8f0] pb-6 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[18px] font-bold text-[#0f172a]">
              Recent Bookings
            </h2>
            <span className="rounded-md bg-[#e6f4f5] px-2.5 py-1 text-[11px] font-bold tracking-wider text-[#07595d] uppercase">
              {displayedCount} APPOINTMENTS VISIBLE
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-[#475569]">
            Check-in status and edit requests for all scheduled slots
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector */}
          <div className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 shadow-2xs">
            <Calendar className="size-4 text-[#475569]" />
            <span
              suppressHydrationWarning
              className="text-[13px] font-medium text-[#0f172a]"
            >
              {bookingDateLabel}
            </span>
            <ChevronDown className="size-3.5 text-[#475569]" />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-1">
            {appointmentPeriods.map((period) => (
              <button
                key={period}
                onClick={() => onFilterPeriodChange(period)}
                className={`cursor-pointer rounded-md px-3 py-1 text-[13px] font-semibold transition-colors ${
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
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#e2e8f0] text-[11px] font-bold tracking-wider text-[#475569] uppercase">
              <th className="px-3 py-3">Que No.</th>
              <th className="px-3 py-3">Patient ID</th>
              <th className="px-3 py-3">Patient Name</th>
              <th className="px-3 py-3">Doctor / Department</th>
              <th className="px-3 py-3">Time</th>
              <th className="px-3 py-3">Mode</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {pageRows.map((item) => {
              const start = new Date(item.starts_at);
              const end = new Date(item.ends_at);
              const row = {
                id: item.id,
                queueNo: item.ticket_number?.toString() ?? "—",
                patientId: item.patient_public_code,
                patientName: item.patient_name,
                patientAvatar: undefined,
                doctorName: item.doctor_name,
                department: item.service_name,
                time: `${appointmentTimeFormatter.format(start)} - ${appointmentTimeFormatter.format(end)}`,
                mode: "In-Person",
                status:
                  item.status.charAt(0).toUpperCase() + item.status.slice(1),
              };
              return (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-slate-50/70"
                >
                  {/* Que No */}
                  <td className="px-3 py-3.5 font-semibold text-[#0f172a]">
                    {row.queueNo}
                  </td>

                  {/* Patient ID */}
                  <td className="px-3 py-3.5 font-semibold text-[#07595d]">
                    {row.patientId}
                  </td>

                  {/* Patient Name with Avatar */}
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8 rounded-full border border-slate-200">
                        <AvatarImage
                          src={row.patientAvatar}
                          alt={row.patientName}
                        />
                        <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700">
                          {row.patientName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-[#0f172a]">
                        {row.patientName}
                      </span>
                    </div>
                  </td>

                  {/* Doctor & Department */}
                  <td className="px-3 py-3.5">
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
                  <td className="px-3 py-3.5 font-medium text-[#0f172a]">
                    {row.time}
                  </td>

                  {/* Mode */}
                  <td className="px-3 py-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[12px] font-medium text-[#334155]">
                      {row.mode === "In-Person" ? (
                        <User className="size-3.5 text-[#64748b]" />
                      ) : (
                        <Video className="size-3.5 text-blue-500" />
                      )}
                      {row.mode}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3.5">
                    {row.status === "Pending" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7ed] px-2.5 py-1 text-[12px] font-medium text-[#f97316]">
                        <span className="size-1.5 rounded-full bg-[#f97316]" />
                        Pending
                      </span>
                    )}
                    {row.status === "Confirmed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eff6ff] px-2.5 py-1 text-[12px] font-medium text-blue-600">
                        <span className="size-1.5 rounded-full bg-blue-600" />
                        Confirmed
                      </span>
                    )}
                    {row.status === "Rejected" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef2f2] px-2.5 py-1 text-[12px] font-medium text-red-600">
                        <span className="size-1.5 rounded-full bg-red-600" />
                        Rejected
                      </span>
                    )}
                    {row.status === "Cancelled" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef2f2] px-2.5 py-1 text-[12px] font-medium text-red-600">
                        <span className="size-1.5 rounded-full bg-red-600" />
                        Cancelled
                      </span>
                    )}
                    {![
                      "Pending",
                      "Confirmed",
                      "Rejected",
                      "Cancelled",
                    ].includes(row.status) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[12px] font-medium text-[#334155]">
                        {row.status.replaceAll("_", " ")}
                      </span>
                    ) : null}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {row.status === "Pending" && (
                        <>
                          <button
                            disabled={pending}
                            onClick={() => onAct(item, "approve")}
                            className="flex cursor-pointer items-center gap-1 rounded-md bg-[#22c55e] px-2.5 py-1 text-[12px] font-bold text-white shadow-2xs transition-colors hover:bg-[#16a34a]"
                          >
                            <Check className="size-3.5 stroke-[2.5]" />
                            <span>Accept</span>
                          </button>
                          <button
                            disabled={pending}
                            onClick={() => onAct(item, "reject")}
                            className="flex cursor-pointer items-center gap-1 rounded-md bg-[#ef4444] px-2.5 py-1 text-[12px] font-bold text-white shadow-2xs transition-colors hover:bg-[#dc2626]"
                          >
                            <X className="size-3.5 stroke-[2.5]" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                      <button
                        aria-label="More actions"
                        className="cursor-pointer rounded p-1 text-[#94a3b8] transition-colors hover:bg-slate-100 hover:text-[#0f172a]"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer & Pagination (Figma 815:202) */}
      <div className="mt-6 flex flex-col justify-between gap-3 border-t border-[#e2e8f0] pt-4 text-[13px] text-[#475569] sm:flex-row sm:items-center">
        <p>
          Showing{" "}
          <strong className="font-semibold text-[#0f172a]">
            {pagination.range}
          </strong>{" "}
          of{" "}
          <strong className="font-semibold text-[#0f172a]">
            {pagination.total}
          </strong>{" "}
          results
        </p>

        <div className="flex items-center gap-1 self-center">
          <button
            disabled={pagination.currentPage === 1}
            onClick={() => onPageChange(pagination.currentPage - 1)}
            className="cursor-pointer rounded-md border border-[#e2e8f0] px-2.5 py-1.5 text-[12px] font-medium text-[#475569] hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          <button className="flex size-8 items-center justify-center rounded-md bg-[#07595d] text-[12px] font-bold text-white">
            {pagination.currentPage}
          </button>
          {pagination.nextPages.map((nextPage) => (
            <button
              key={nextPage}
              onClick={() => onPageChange(nextPage)}
              className="flex size-8 cursor-pointer items-center justify-center rounded-md text-[12px] font-medium text-[#475569] hover:bg-slate-50"
            >
              {nextPage}
            </button>
          ))}
          {pagination.lastPage > pagination.currentPage + 3 && (
            <span className="px-1 text-slate-400">...</span>
          )}
          {pagination.lastPage > pagination.currentPage + 2 && (
            <button
              onClick={() => onPageChange(pagination.lastPage)}
              className="flex size-8 cursor-pointer items-center justify-center rounded-md text-[12px] font-medium text-[#475569] hover:bg-slate-50"
            >
              {pagination.lastPage}
            </button>
          )}
          <button
            disabled={pagination.currentPage === pagination.lastPage}
            onClick={() => onPageChange(pagination.currentPage + 1)}
            className="cursor-pointer rounded-md border border-[#e2e8f0] px-2.5 py-1.5 text-[12px] font-medium text-[#475569] hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
