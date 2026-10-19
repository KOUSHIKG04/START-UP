import type { AppointmentsSummaryCardsProps } from "../types/appointmentsSummaryCards";

import { CalendarDays, Check, Clock, XCircle } from "lucide-react";

export function AppointmentsSummaryCards({
  summary,
}: AppointmentsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Appointments */}
      <div className="border-border bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              Total Appointments
            </p>
            <h3 className="text-foreground mt-2 text-3xl leading-none font-bold">
              {summary.total}
            </h3>
          </div>
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg text-blue-600">
            <CalendarDays className="size-5" />
          </div>
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span className="size-2 shrink-0 rounded-full bg-blue-600" />
          <span>Today&apos;s total schedule</span>
        </div>
      </div>

      {/* Confirmed Today */}
      <div className="border-border bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              Confirmed Today
            </p>
            <h3 className="text-foreground mt-2 text-3xl leading-none font-bold">
              {summary.confirmed}
            </h3>
          </div>
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg text-emerald-600">
            <Check className="size-5 stroke-2" />
          </div>
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span className="bg-primary size-2 shrink-0 rounded-full" />
          <span>Ready for consultation</span>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="border-border bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              Pending Requests
            </p>
            <h3 className="text-foreground mt-2 text-3xl leading-none font-bold">
              {summary.pending}
            </h3>
          </div>
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg text-orange-500">
            <Clock className="size-5" />
          </div>
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span className="bg-primary size-2 shrink-0 rounded-full" />
          <span>Awaiting administrative approval</span>
        </div>
      </div>

      {/* Cancelled */}
      <div className="border-border bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              Cancelled
            </p>
            <h3 className="text-foreground mt-2 text-3xl leading-none font-bold">
              {summary.cancelled}
            </h3>
          </div>
          <div className="bg-destructive/10 flex size-10 shrink-0 items-center justify-center rounded-lg text-red-500">
            <XCircle className="size-5" />
          </div>
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span className="bg-destructive size-2 shrink-0 rounded-full" />
          <span>Rescheduled or revoked</span>
        </div>
      </div>
    </div>
  );
}
