import type { ReactNode } from "react";
import Link from "next/link";
import { AcceptPendingAppointmentButton } from "../components/AcceptPendingAppointmentButton";
import { DashboardErrorToast } from "../components/DashboardErrorToast";
import {
  formatDisplayDate,
  formatDisplayDateTime,
  type BedInventoryProjection,
  type ClinicAppointment,
} from "@startup/contracts";
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
}: {
  doctorAction: ReactNode;
  doctorRequests?: ReactNode;
  inventory: BedInventoryProjection[];
  appointments: ClinicAppointment[];
  weeklyDoctors: {
    id: string;
    name: string;
    speciality: string;
    days: boolean[];
  }[];
  loadError?: string;
  acceptAppointment: (input: unknown) => Promise<{ error: string | null }>;
}) {
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
          <h1 className="text-[24px] font-bold tracking-tight text-[#0f172a]">
            Hospital Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex w-64 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 shadow-xs">
            <Search className="size-4 shrink-0 text-[#94a3b8]" />
            <input
              type="text"
              aria-label="Search patient, doctor..."
              placeholder="Search patient, doctor..."
              className="w-full bg-transparent text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none"
            />
          </div>

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

      <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-6 shadow-xs">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[18px] font-bold text-[#0f172a]">
              Bed Availability by Type
            </h2>
            <p className="mt-0.5 text-[13px] text-[#475569]">
              Availability &amp; occupancy metrics across specialized wards
            </p>
          </div>
          <div className="inline-flex items-center self-start rounded-lg bg-[#e6f4f5] px-3 py-1.5 sm:self-auto">
            <span className="text-[11px] font-semibold tracking-wide text-[#07595d] uppercase">
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
                className="flex flex-col justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-2xs transition-colors hover:border-slate-300"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[15px] leading-tight font-semibold text-[#0f172a]">
                      {ward.name}
                    </h3>
                    <span className="text-[11px] text-[#94a3b8]">
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
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#475569]">
                      Available{" "}
                      <strong className="font-bold text-[#0f172a]">
                        {ward.available}
                      </strong>{" "}
                      • Occupied{" "}
                      <strong className="font-bold text-[#0f172a]">
                        {ward.occupied}
                      </strong>
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${ward.iconBg} ${ward.iconColor}`}
                    >
                      {ward.percent}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
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
            <p className="text-[13px] text-[#475569]">
              {inventory.length === 0
                ? "This facility does not offer patient beds."
                : "Set initial counts in Bed Management before availability is shown."}
            </p>
          )}
        </div>
      </div>

      <div>{doctorAction}</div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex min-h-[420px] flex-col justify-between rounded-[16px] border border-[#e2e8f0] bg-white p-6 shadow-xs lg:col-span-8">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="size-5 text-[#07595d]" />
                <h3 className="text-[18px] font-bold text-[#0f172a]">
                  Doctor Weekly Schedule
                </h3>
              </div>
              <Link
                href="/doctor-schedules"
                className="cursor-pointer text-[13px] font-semibold text-[#07595d] hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[540px]">
                <div className="mb-1 flex items-center rounded-md bg-[#f8fafc] px-4 py-2 text-[11px] font-bold text-[#475569]">
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

                <div className="divide-y divide-[#e2e8f0]">
                  {weeklyDoctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center px-4 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="w-[180px] shrink-0 leading-tight">
                        <p className="text-[14px] font-semibold text-[#0f172a]">
                          {doc.name}
                        </p>
                        <p className="text-[12px] text-[#475569]">
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
                                isAvail ? "bg-[#22c55e]" : "bg-[#ef4444]"
                              }`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex w-8 shrink-0 justify-end">
                        <ChevronRight className="size-4 text-[#94a3b8]" />
                      </div>
                    </div>
                  ))}
                  {weeklyDoctors.length === 0 && (
                    <p className="px-4 py-5 text-[13px] text-[#64748b]">
                      No doctors are associated with this facility yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col justify-between rounded-[16px] border border-[#e2e8f0] bg-white p-6 shadow-xs lg:col-span-4">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="size-5 text-[#07595d]" />
                <h3 className="text-[18px] font-bold text-[#0f172a]">
                  Pending Requests
                </h3>
              </div>
              <Link
                href="/appointments"
                className="cursor-pointer text-[13px] font-semibold text-[#07595d] hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="flex flex-col gap-3.5">
              {doctorRequests}
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-2xs transition-colors hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-[14px] font-bold text-[#0f172a]">
                        {request.patient_name}
                      </h4>
                      <p className="text-[12px] text-[#475569]">
                        {request.service_name}
                      </p>
                    </div>
                    <span className="rounded-md bg-[#eff6ff] px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-[#3b82f6]">
                      {formatDisplayDateTime(request.starts_at, "Asia/Kolkata")}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-[#94a3b8]">
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
                <p className="text-[13px] text-[#475569]">
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
