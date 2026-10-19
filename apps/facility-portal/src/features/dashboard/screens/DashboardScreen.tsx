import type { DashboardScreenProps } from "../types/dashboardScreen";

import Link from "next/link";
import { AcceptPendingAppointmentButton } from "../components/AcceptPendingAppointmentButton";
import { DashboardErrorToast } from "../components/DashboardErrorToast";
import { formatDisplayDate, formatDisplayDateTime } from "@startup/contracts";
import {
  Search,
  Calendar,
  CalendarDays,
  Clock,
  ChevronRight,
} from "lucide-react";

import { scheduleDays } from "../utils/dashboardConstants";
import { wards as wardStyles } from "../utils/dashboardConstants";

export default function DashboardScreen({
  doctorAction,
  doctorRequests,
  inventory,
  appointments,
  weeklyDoctors,
  loadError,
  acceptAppointment,
}: DashboardScreenProps) {
  const wards = inventory
    .filter((item) => item.configured)
    .map((item, index) => {
      const style = wardStyles[index % wardStyles.length];
      return {
        ...style,
        name: item.bedTypeName,
        total: item.total,
        available: item.available,
        occupied: item.occupied,
        percent:
          item.total > 0 ? Math.round((item.available / item.total) * 100) : 0,
      };
    });

  const capacity = inventory
    .filter((item) => item.configured)
    .reduce((sum, item) => sum + item.total, 0);
  const now = new Date().getTime();

  const pendingRequests = appointments
    .filter(
      (item) =>
        item.status === "pending" &&
        new Date(item.starts_at).getTime() > now &&
        (item.request_expires_at === null ||
          new Date(item.request_expires_at).getTime() > now)
    )
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    )
    .slice(0, 2);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <DashboardErrorToast message={loadError} />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Hospital Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="border-border bg-card flex w-64 items-center gap-2 rounded-lg border px-3 py-2 shadow-xs">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <input
              type="text"
              aria-label="Search patient, doctor..."
              placeholder="Search patient, doctor..."
              className="text-foreground placeholder-muted-foreground focus-visible:ring-primary focus-visible:ring-offset-background w-full bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          </div>

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

      <div className="border-border bg-card rounded-lg border p-6 shadow-xs">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-lg font-bold">
              Bed Availability by Type
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Availability &amp; occupancy metrics across specialized wards
            </p>
          </div>
          <div className="bg-muted inline-flex items-center self-start rounded-lg px-3 py-1.5 sm:self-auto">
            <span className="text-primary text-xs font-semibold tracking-wide uppercase">
              TOTAL CAPACITY: {capacity} BEDS
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {wards.map((ward) => {
            const Icon = ward.icon;
            return (
              <div
                key={ward.name}
                className="border-border bg-card hover:border-border flex flex-col justify-between gap-3 rounded-xl border p-4 shadow-2xs transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-foreground text-sm leading-tight font-semibold">
                      {ward.name}
                    </h3>
                    <span className="text-muted-foreground text-xs">
                      Total: {ward.total}
                    </span>
                  </div>
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${ward.iconBg} ${ward.iconColor}`}
                  >
                    <Icon className="size-[18px]" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Available{" "}
                      <strong className="text-foreground font-bold">
                        {ward.available}
                      </strong>{" "}
                      • Occupied{" "}
                      <strong className="text-foreground font-bold">
                        {ward.occupied}
                      </strong>
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-bold ${ward.iconBg} ${ward.iconColor}`}
                    >
                      {ward.percent}%
                    </span>
                  </div>

                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full ${ward.progressColor}`}
                      style={{ width: `${ward.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {!loadError && wards.length === 0 && (
            <p className="text-muted-foreground text-sm">
              {inventory.length === 0
                ? "This facility does not offer patient beds."
                : "Set initial counts in Bed Management before availability is shown."}
            </p>
          )}
        </div>
      </div>

      <div>{doctorAction}</div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="border-border bg-card flex min-h-[420px] flex-col justify-between rounded-lg border p-6 shadow-xs lg:col-span-8">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="text-primary size-5" />
                <h3 className="text-foreground text-lg font-bold">
                  Doctor Weekly Schedule
                </h3>
              </div>
              <Link
                href="/doctor-schedules"
                className="text-primary cursor-pointer text-sm font-semibold hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[540px]">
                <div className="bg-background text-muted-foreground mb-1 flex items-center rounded-md px-4 py-2 text-xs font-bold">
                  <div className="w-[180px] shrink-0">Doctor / Speciality</div>
                  <div className="flex flex-1 justify-between px-4 text-center">
                    {scheduleDays.map((day) => (
                      <span key={day} className="w-8">
                        {day}
                      </span>
                    ))}
                  </div>
                  <div className="w-8 shrink-0" />
                </div>

                <div className="divide-border divide-y">
                  {weeklyDoctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="hover:bg-muted flex items-center px-4 py-3 transition-colors"
                    >
                      <div className="w-[180px] shrink-0 leading-tight">
                        <p className="text-foreground text-sm font-semibold">
                          {doc.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {doc.speciality}
                        </p>
                      </div>

                      <div className="flex flex-1 items-center justify-between px-4">
                        {doc.days.map((isAvail, idx) => (
                          <div
                            key={idx}
                            className="flex w-8 items-center justify-center"
                          >
                            <span
                              className={`size-2 rounded-full ${
                                isAvail ? "bg-primary" : "bg-destructive"
                              }`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex w-8 shrink-0 justify-end">
                        <ChevronRight className="text-muted-foreground size-4" />
                      </div>
                    </div>
                  ))}
                  {weeklyDoctors.length === 0 && (
                    <p className="text-muted-foreground px-4 py-5 text-sm">
                      No doctors are associated with this facility yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-border bg-card flex min-h-[420px] flex-col justify-between rounded-lg border p-6 shadow-xs lg:col-span-4">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="text-primary size-5" />
                <h3 className="text-foreground text-lg font-bold">
                  Pending Requests
                </h3>
              </div>
              <Link
                href="/appointments"
                className="text-primary cursor-pointer text-sm font-semibold hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="flex flex-col gap-3.5">
              {doctorRequests}
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="border-border bg-card hover:border-border rounded-xl border p-4 shadow-2xs transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-foreground text-sm font-bold">
                        {request.patient_name}
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        {request.service_name}
                      </p>
                    </div>
                    <span className="bg-muted text-primary rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap">
                      {formatDisplayDateTime(request.starts_at, "Asia/Kolkata")}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">
                      {request.public_code}
                    </span>
                    <AcceptPendingAppointmentButton
                      appointmentId={request.id}
                      expectedVersion={Number(request.row_version)}
                      action={acceptAppointment}
                    />
                  </div>
                </div>
              ))}
              {pendingRequests.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No pending appointment requests.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
