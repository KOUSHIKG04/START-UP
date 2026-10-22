import type { AppointmentsTableProps } from "../types/appointmentsTable";

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

import {
  appointmentPeriods,
  appointmentSourceLabels,
} from "../utils/appointmentsConstants";

export function AppointmentsTable({
  now,
  pageRows,
  pending,
  onAct,
  pagination,
  onPageChange,
  displayedCount,
  filterPeriod,
  onFilterPeriodChange,
  bookingDateLabel,
}: AppointmentsTableProps) {
  return (
    <div className="border-border bg-card rounded-lg border p-6 shadow-xs">
      {/* Card Header & Controls */}
      <div className="border-border flex flex-col justify-between gap-4 border-b pb-6 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-foreground text-lg font-bold">
              Recent Bookings
            </h2>
            <span className="bg-muted text-primary rounded-md px-2.5 py-1 text-xs font-bold tracking-wider uppercase">
              {displayedCount} APPOINTMENTS VISIBLE
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Check-in status and edit requests for all scheduled slots
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector */}
          <div className="border-border bg-card flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 shadow-2xs">
            <Calendar className="text-muted-foreground size-4" />
            <span
              suppressHydrationWarning
              className="text-foreground text-sm font-medium"
            >
              {bookingDateLabel}
            </span>
            <ChevronDown className="text-muted-foreground size-3.5" />
          </div>

          {/* Filter Pills */}
          <div className="border-border bg-background flex items-center gap-1 rounded-lg border p-1">
            {appointmentPeriods.map((period) => (
              <button
                key={period}
                onClick={() => onFilterPeriodChange(period)}
                className={`cursor-pointer rounded-md px-3 py-1 text-sm font-semibold transition-colors ${
                  filterPeriod === period
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:text-foreground"
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
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b text-xs font-bold tracking-wider uppercase">
              <th className="px-3 py-3">Que No.</th>
              <th className="px-3 py-3">Patient ID</th>
              <th className="px-3 py-3">Patient Name</th>
              <th className="px-3 py-3">Doctor / Department</th>
              <th className="px-3 py-3">Time</th>
              <th className="px-3 py-3">Mode</th>
              <th className="px-3 py-3">Source / Queue</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {pageRows.map((item) => {
              const start = new Date(item.starts_at);
              const end = new Date(item.ends_at);
              const appointmentTimeFormatter = new Intl.DateTimeFormat(
                "en-US",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: item.timezone,
                }
              );
              const clinicDayFormatter = new Intl.DateTimeFormat("en-CA", {
                timeZone: item.timezone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              });
              const isClinicDay =
                clinicDayFormatter.format(start) ===
                clinicDayFormatter.format(new Date(now));
              const expiredPending =
                item.status === "pending" &&
                (start.getTime() <= now ||
                  (item.request_expires_at !== null &&
                    new Date(item.request_expires_at).getTime() <= now));
              const row = {
                id: item.id,
                queueNo:
                  item.visit_mode === "clinic"
                    ? (item.ticket_number?.toString() ?? "—")
                    : "—",
                patientId: item.patient_public_code,
                patientName: item.patient_name,
                patientAvatar: undefined,
                doctorName: item.doctor_name,
                department: item.service_name,
                time: `${appointmentTimeFormatter.format(start)} - ${appointmentTimeFormatter.format(end)}`,
                mode:
                  item.visit_mode === "online"
                    ? "Video"
                    : item.visit_mode === "home"
                      ? "Home Visit"
                      : "In-Person",
                status:
                  item.status.charAt(0).toUpperCase() + item.status.slice(1),
              };
              return (
                <tr
                  key={row.id}
                  className="hover:bg-muted/70 transition-colors"
                >
                  {/* Que No */}
                  <td className="text-foreground px-3 py-3.5 font-semibold">
                    {row.queueNo}
                  </td>

                  {/* Patient ID */}
                  <td className="text-primary px-3 py-3.5 font-semibold">
                    {row.patientId}
                  </td>

                  {/* Patient Name with Avatar */}
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="border-border size-8 rounded-full border">
                        <AvatarImage
                          src={row.patientAvatar}
                          alt={row.patientName}
                        />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                          {row.patientName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-foreground font-semibold">
                        {row.patientName}
                      </span>
                    </div>
                    <details className="mt-2 text-xs">
                      <summary className="text-primary cursor-pointer">
                        Patient details
                      </summary>
                      <dl className="mt-2 space-y-1">
                        <div>
                          <dt className="inline font-medium">Age: </dt>
                          <dd className="inline">
                            {item.patient_age_years ?? "Not recorded"}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline font-medium">Gender: </dt>
                          <dd className="inline">
                            {item.patient_gender ?? "Not recorded"}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline font-medium">Contact: </dt>
                          <dd className="inline">
                            {item.patient_phone ?? "Not recorded"}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline font-medium">Reason: </dt>
                          <dd className="inline">
                            {item.reason || "Not recorded"}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline font-medium">Appointment: </dt>
                          <dd className="inline">
                            {item.public_code.slice(-8)}
                          </dd>
                        </div>
                      </dl>
                    </details>
                  </td>

                  {/* Doctor & Department */}
                  <td className="px-3 py-3.5">
                    <div className="flex flex-col leading-tight">
                      <span className="text-foreground font-semibold">
                        {row.doctorName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {row.department}
                      </span>
                    </div>
                  </td>

                  {/* Time */}
                  <td className="text-foreground px-3 py-3.5 font-medium">
                    {row.time}
                  </td>

                  {/* Mode */}
                  <td className="px-3 py-3.5">
                    <span className="bg-muted text-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                      {row.mode !== "Video" ? (
                        <User className="text-muted-foreground size-3.5" />
                      ) : (
                        <Video className="size-3.5 text-blue-500" />
                      )}
                      {row.mode}
                    </span>
                  </td>

                  <td className="px-3 py-3.5 text-xs">
                    <p>
                      {item.source
                        ? appointmentSourceLabels[item.source]
                        : "Not recorded"}
                    </p>
                    {item.visit_mode === "clinic" ? (
                      <p className="mt-1 capitalize">
                        {item.queue_state?.replaceAll("_", " ") ??
                          "No queue entry"}
                        {item.queue_state === "waiting"
                          ? ` · ${item.ahead_count} ahead`
                          : ""}
                      </p>
                    ) : null}
                  </td>
                  {/* Status */}
                  <td className="px-3 py-3.5">
                    {row.status === "Pending" && !expiredPending && (
                      <span className="bg-muted text-primary inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                        <span className="bg-primary size-1.5 rounded-full" />
                        Pending
                      </span>
                    )}
                    {expiredPending && (
                      <span className="bg-muted text-foreground inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium">
                        Expired request
                      </span>
                    )}
                    {row.status === "Confirmed" && (
                      <span className="bg-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-blue-600">
                        <span className="size-1.5 rounded-full bg-blue-600" />
                        Confirmed
                      </span>
                    )}
                    {row.status === "Rejected" && (
                      <span className="bg-destructive/10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-red-600">
                        <span className="size-1.5 rounded-full bg-red-600" />
                        Rejected
                      </span>
                    )}
                    {row.status === "Cancelled" && (
                      <span className="bg-destructive/10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-red-600">
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
                      <span className="bg-muted text-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                        {row.status.replaceAll("_", " ")}
                      </span>
                    ) : null}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.visit_mode === "clinic" &&
                      item.status === "confirmed" ? (
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {(
                            [
                              [
                                "check_in",
                                "Check in",
                                item.queue_state === "awaiting_arrival" &&
                                  isClinicDay,
                              ],
                              [
                                "call",
                                "Call next",
                                item.queue_state === "waiting" &&
                                  item.ahead_count === 0 &&
                                  isClinicDay,
                              ],
                              [
                                "hold",
                                "Hold",
                                ["waiting", "called"].includes(
                                  item.queue_state ?? ""
                                ),
                              ],
                              ["resume", "Resume", item.queue_state === "held"],
                              [
                                "no_show",
                                "No-show",
                                end.getTime() <= now &&
                                  [
                                    "awaiting_arrival",
                                    "waiting",
                                    "called",
                                    "held",
                                  ].includes(item.queue_state ?? ""),
                              ],
                            ] as const
                          )
                            .filter(([, , visible]) => visible)
                            .map(([action, label]) => (
                              <button
                                key={action}
                                disabled={pending}
                                onClick={() => onAct(item, action)}
                                className="border-border hover:bg-muted rounded-md border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50"
                              >
                                {label}
                              </button>
                            ))}
                        </div>
                      ) : null}
                      {row.status === "Pending" && !expiredPending && (
                        <>
                          <button
                            disabled={pending}
                            onClick={() => onAct(item, "approve")}
                            className="bg-primary text-primary-foreground hover:bg-primary flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold shadow-2xs transition-colors"
                          >
                            <Check className="size-3.5 stroke-2" />
                            <span>Accept</span>
                          </button>
                          <button
                            disabled={pending}
                            onClick={() => onAct(item, "reject")}
                            className="bg-destructive text-primary-foreground hover:bg-destructive flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold shadow-2xs transition-colors"
                          >
                            <X className="size-3.5 stroke-2" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                      <button
                        aria-label="More actions"
                        className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded p-1 transition-colors"
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
      <div className="border-border text-muted-foreground mt-6 flex flex-col justify-between gap-3 border-t pt-4 text-sm sm:flex-row sm:items-center">
        <p>
          Showing{" "}
          <strong className="text-foreground font-semibold">
            {pagination.range}
          </strong>{" "}
          of{" "}
          <strong className="text-foreground font-semibold">
            {pagination.total}
          </strong>{" "}
          results
        </p>

        <div className="flex items-center gap-1 self-center">
          <button
            disabled={pagination.currentPage === 1}
            onClick={() => onPageChange(pagination.currentPage - 1)}
            className="border-border text-muted-foreground hover:bg-muted cursor-pointer rounded-md border px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
          >
            Previous
          </button>
          <button className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md text-xs font-bold">
            {pagination.currentPage}
          </button>
          {pagination.nextPages.map((nextPage) => (
            <button
              key={nextPage}
              onClick={() => onPageChange(nextPage)}
              className="text-muted-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-md text-xs font-medium"
            >
              {nextPage}
            </button>
          ))}
          {pagination.lastPage > pagination.currentPage + 3 && (
            <span className="text-muted-foreground px-1">...</span>
          )}
          {pagination.lastPage > pagination.currentPage + 2 && (
            <button
              onClick={() => onPageChange(pagination.lastPage)}
              className="text-muted-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-md text-xs font-medium"
            >
              {pagination.lastPage}
            </button>
          )}
          <button
            disabled={pagination.currentPage === pagination.lastPage}
            onClick={() => onPageChange(pagination.currentPage + 1)}
            className="border-border text-muted-foreground hover:bg-muted cursor-pointer rounded-md border px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
