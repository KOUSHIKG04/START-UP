import type { DoctorSchedulesStatsProps } from "../types/doctorSchedulesStats";

import { Contact, Check, Activity, AlertTriangle } from "lucide-react";

export function DoctorSchedulesStats({
  scheduleSummary,
}: DoctorSchedulesStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Doctors */}
      <div className="border-border bg-card flex flex-col justify-between gap-3 rounded-xl border p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <p className="text-muted-foreground text-sm font-medium">
            Total Doctors
          </p>
          <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg">
            <Contact className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-foreground text-3xl leading-none font-bold">
            {scheduleSummary.total}
          </h3>
          <span className="text-muted-foreground text-xs">On roster today</span>
        </div>
      </div>

      {/* Available Now */}
      <div className="border-border bg-card flex flex-col justify-between gap-3 rounded-xl border p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <p className="text-muted-foreground text-sm font-medium">
            Available Now
          </p>
          <div className="bg-muted text-primary flex size-8 items-center justify-center rounded-lg">
            <Check className="size-4 stroke-2" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-foreground text-3xl leading-none font-bold">
            {scheduleSummary.available}
          </h3>
          <span className="text-primary text-xs font-medium">
            Ready for walk-ins
          </span>
        </div>
      </div>

      {/* In Surgery */}
      <div className="border-border bg-card flex flex-col justify-between gap-3 rounded-xl border p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <p className="text-muted-foreground text-sm font-medium">
            In Surgery
          </p>
          <div className="bg-destructive/10 text-destructive flex size-8 items-center justify-center rounded-lg">
            <Activity className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-foreground text-3xl leading-none font-bold">
            {scheduleSummary.surgery ?? "—"}
          </h3>
          <span className="text-destructive text-xs font-medium">
            {scheduleSummary.surgery === null
              ? "Not tracked"
              : "Active operations"}
          </span>
        </div>
      </div>

      {/* On Emergency Duty */}
      <div className="border-border bg-card flex flex-col justify-between gap-3 rounded-xl border p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <p className="text-muted-foreground text-sm font-medium">
            On Emergency Duty
          </p>
          <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg">
            <AlertTriangle className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-muted-foreground text-3xl leading-none font-bold">
            {scheduleSummary.emergency ?? "—"}
          </h3>
          <span className="text-muted-foreground text-xs">
            {scheduleSummary.emergency === null
              ? "Not tracked"
              : "On-call / Trauma"}
          </span>
        </div>
      </div>
    </div>
  );
}
