"use client";
import { useBedManagementScreen } from "../hooks/useBedManagementScreen";

import type { BedManagementScreenProps } from "../types/bedManagementScreen";

import { BedCountStepper } from "../components/BedCountStepper";
import { InitialBedCountsForm } from "../components/InitialBedCountsForm";

import { Search, Bell, Calendar, Bed, Check, User, Wrench } from "lucide-react";

export default function BedManagementScreen({
  inventory,
  loadError,
}: BedManagementScreenProps) {
  const {
    viewMode,
    setViewMode,
    departments,
    handleSetCount,
    acceptSavedRow,
    totalBeds,
    totalAvailable,
    totalOccupied,
    availPercent,
    occPercent,
    totalMaintenance,
    pendingIds,
    bedManagementDateLabel,
  } = useBedManagementScreen({ inventory, loadError });
  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* TopBar (Figma 832:56) */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Bed Management
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="border-border bg-card flex w-56 items-center gap-2 rounded-lg border px-3 py-2 shadow-xs">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <input
              type="text"
              aria-label="Search patient, doctor..."
              placeholder="Search patient, doctor..."
              className="text-foreground placeholder-muted-foreground focus-visible:ring-primary focus-visible:ring-offset-background w-full bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          </div>

          {/* Bell button */}
          <button
            aria-label="Notifications"
            className="border-border bg-card text-muted-foreground hover:bg-muted flex size-9 cursor-pointer items-center justify-center rounded-lg border shadow-xs transition-colors"
          >
            <Bell className="size-4" />
          </button>

          {/* Date Badge */}
          <div className="border-border bg-card flex items-center gap-2 rounded-lg border px-3 py-2 shadow-xs">
            <Calendar className="text-muted-foreground size-4 shrink-0" />
            <span
              suppressHydrationWarning
              className="text-muted-foreground text-sm font-semibold whitespace-nowrap"
            >
              {bedManagementDateLabel}
            </span>
          </div>
        </div>
      </div>

      {!loadError && inventory.length === 0 && (
        <p className="text-muted-foreground text-sm">
          This facility does not offer patient beds.
        </p>
      )}

      {/* 4 Stat Cards Row (Figma 832:71) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Beds */}
        <div className="border-border bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Total Beds
              </p>
              <h3 className="text-foreground mt-2 text-3xl leading-none font-bold">
                {totalBeds}
              </h3>
            </div>
            <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Bed className="size-5" />
            </div>
          </div>
        </div>

        {/* Available */}
        <div className="border-border bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Available
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <h3 className="text-primary text-3xl leading-none font-bold">
                  {totalAvailable}
                </h3>
                <span className="text-primary text-xs font-semibold">
                  {availPercent}% available
                </span>
              </div>
            </div>
            <div className="bg-muted text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Check className="size-5 stroke-2" />
            </div>
          </div>
        </div>

        {/* Occupied */}
        <div className="border-border bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Occupied
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <h3 className="text-primary text-3xl leading-none font-bold">
                  {totalOccupied}
                </h3>
                <span className="text-primary text-xs font-semibold">
                  {occPercent}% occupied
                </span>
              </div>
            </div>
            <div className="bg-muted text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <User className="size-5" />
            </div>
          </div>
        </div>

        {/* Under Maintenance */}
        <div className="border-border bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Under Maintenance
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <h3 className="text-muted-foreground text-3xl leading-none font-bold">
                  {totalMaintenance}
                </h3>
                <span className="text-muted-foreground text-xs font-semibold">
                  {totalBeds > 0
                    ? ((totalMaintenance / totalBeds) * 100).toFixed(1)
                    : "0"}
                  % offline
                </span>
              </div>
            </div>
            <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Wrench className="size-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Bed Availability by Department (Figma 832:86) */}
      <div className="border-border bg-card rounded-lg border p-6 shadow-xs">
        {/* Header & Toggle */}
        <div className="border-border flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-lg font-bold">
              Bed Availability by Department
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Overall occupancy rate across departments
            </p>
          </div>

          {/* % Percentage / Count Switch */}
          <div className="border-border bg-muted inline-flex items-center self-start rounded-lg border p-1 sm:self-auto">
            <button
              onClick={() => setViewMode("percent")}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                viewMode === "percent"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              % Percentage
            </button>
            <button
              onClick={() => setViewMode("count")}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                viewMode === "count"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Count
            </button>
          </div>
        </div>

        {/* Departments Table */}
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs font-bold">
                <th className="px-3 py-3">Department</th>
                <th className="px-3 py-3 text-center">Total Beds</th>
                <th className="px-3 py-3 text-center">Available</th>
                <th className="px-3 py-3 text-center">Occupied</th>
                <th className="px-3 py-3">Occupancy Rate</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {departments.map((dept) => {
                const occupancyPct =
                  dept.total > 0
                    ? Math.round((dept.occupied / dept.total) * 100)
                    : 0;

                return (
                  <tr
                    key={`${dept.facilityId}:${dept.id}`}
                    className="hover:bg-muted/70 transition-colors"
                  >
                    {/* Department name with dot */}
                    <td className="px-3 py-3.5">
                      <div className="text-foreground flex items-center gap-2.5 font-semibold">
                        <span
                          className={`size-2.5 rounded-full ${dept.dotColor} shrink-0`}
                        />
                        <span>{dept.name}</span>
                      </div>
                    </td>

                    {!dept.configured ? (
                      <td colSpan={4} className="px-3 py-3.5">
                        <InitialBedCountsForm
                          row={dept}
                          onSaved={acceptSavedRow}
                        />
                      </td>
                    ) : (
                      <>
                        {/* Total Beds */}
                        <td className="text-foreground px-3 py-3.5 text-center font-medium">
                          {dept.total}
                        </td>

                        {/* Available with Stepper (- / +) */}
                        <td className="px-3 py-3.5 text-center">
                          <BedCountStepper
                            label={`Available beds for ${dept.name}`}
                            value={dept.available}
                            max={dept.total - dept.maintenance}
                            disabled={pendingIds.has(dept.id)}
                            onCommit={(value) => {
                              void handleSetCount(dept.id, "available", value);
                            }}
                          />
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <BedCountStepper
                            label={`Occupied beds for ${dept.name}`}
                            value={dept.occupied}
                            max={dept.total - dept.maintenance}
                            disabled={pendingIds.has(dept.id)}
                            onCommit={(value) => {
                              void handleSetCount(dept.id, "occupied", value);
                            }}
                          />
                        </td>

                        {/* Occupancy Rate Bar & Label */}
                        <td className="px-3 py-3.5">
                          <div className="flex max-w-[280px] items-center gap-4">
                            <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${dept.barColor}`}
                                style={{ width: `${occupancyPct}%` }}
                              />
                            </div>
                            <span className="text-foreground w-12 text-right text-sm font-bold">
                              {viewMode === "percent"
                                ? `${occupancyPct}%`
                                : `${dept.occupied}/${dept.total}`}
                            </span>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
