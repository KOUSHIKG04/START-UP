"use client";

import { useEffect } from "react";
import { toast } from "@startup/web-ui/components/ui/toast";
import { useBedManagement } from "../hooks/useBedManagement";
import type { BedInventoryProjection } from "@startup/contracts";
import { BedCountStepper } from "../components/BedCountStepper";
import { InitialBedCountsForm } from "../components/InitialBedCountsForm";
import { bedManagementDateFormatter } from "../utils/bedManagementDate";
import { Search, Bell, Calendar, Bed, Check, User, Wrench } from "lucide-react";

export default function BedManagementScreen({
  inventory,
  loadError,
}: {
  inventory: BedInventoryProjection[];
  loadError?: string;
}) {
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
  } = useBedManagement(inventory);
  useEffect(() => {
    if (loadError)
      toast.add({
        title: "Could not load bed inventory",
        description: loadError,
        type: "error",
      });
  }, [loadError]);
  const bedManagementDateLabel = bedManagementDateFormatter.format(new Date());

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* TopBar (Figma 832:56) */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#0f172a]">
            Bed Management
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="flex w-56 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 shadow-xs">
            <Search className="size-4 shrink-0 text-[#94a3b8]" />
            <input
              type="text"
              aria-label="Search patient, doctor..."
              placeholder="Search patient, doctor..."
              className="w-full bg-transparent text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none"
            />
          </div>

          {/* Bell button */}
          <button
            aria-label="Notifications"
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#475569] shadow-xs transition-colors hover:bg-slate-50"
          >
            <Bell className="size-4" />
          </button>

          {/* Date Badge */}
          <div className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 shadow-xs">
            <Calendar className="size-4 shrink-0 text-[#475569]" />
            <span
              suppressHydrationWarning
              className="text-[13px] font-semibold whitespace-nowrap text-[#475569]"
            >
              {bedManagementDateLabel}
            </span>
          </div>
        </div>
      </div>

      {!loadError && inventory.length === 0 && (
        <p className="text-[13px] text-[#475569]">
          This facility does not offer patient beds.
        </p>
      )}

      {/* 4 Stat Cards Row (Figma 832:71) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Beds */}
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#475569]">
                Total Beds
              </p>
              <h3 className="mt-2 text-[28px] leading-none font-bold text-[#0f172a]">
                {totalBeds}
              </h3>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f5f9] text-slate-600">
              <Bed className="size-5" />
            </div>
          </div>
        </div>

        {/* Available */}
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#475569]">
                Available
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <h3 className="text-[28px] leading-none font-bold text-[#10b981]">
                  {totalAvailable}
                </h3>
                <span className="text-[12px] font-semibold text-[#10b981]">
                  {availPercent}% available
                </span>
              </div>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#10b981]">
              <Check className="size-5 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Occupied */}
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#475569]">Occupied</p>
              <div className="mt-2 flex items-baseline gap-2">
                <h3 className="text-[28px] leading-none font-bold text-[#3b82f6]">
                  {totalOccupied}
                </h3>
                <span className="text-[12px] font-semibold text-[#3b82f6]">
                  {occPercent}% occupied
                </span>
              </div>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eff6ff] text-[#3b82f6]">
              <User className="size-5" />
            </div>
          </div>
        </div>

        {/* Under Maintenance */}
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#475569]">
                Under Maintenance
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <h3 className="text-[28px] leading-none font-bold text-[#f59e0b]">
                  {totalMaintenance}
                </h3>
                <span className="text-[12px] font-semibold text-[#f59e0b]">
                  {totalBeds > 0
                    ? ((totalMaintenance / totalBeds) * 100).toFixed(1)
                    : "0"}
                  % offline
                </span>
              </div>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#fffbeb] text-[#f59e0b]">
              <Wrench className="size-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Bed Availability by Department (Figma 832:86) */}
      <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-6 shadow-xs">
        {/* Header & Toggle */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#e2e8f0] pb-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[18px] font-bold text-[#0f172a]">
              Bed Availability by Department
            </h2>
            <p className="mt-0.5 text-[13px] text-[#475569]">
              Overall occupancy rate across departments
            </p>
          </div>

          {/* % Percentage / Count Switch */}
          <div className="inline-flex items-center self-start rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] p-1 sm:self-auto">
            <button
              onClick={() => setViewMode("percent")}
              className={`cursor-pointer rounded-md px-3 py-1 text-[12px] font-semibold transition-colors ${
                viewMode === "percent"
                  ? "bg-white text-[#0f172a] shadow-xs"
                  : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              % Percentage
            </button>
            <button
              onClick={() => setViewMode("count")}
              className={`cursor-pointer rounded-md px-3 py-1 text-[12px] font-semibold transition-colors ${
                viewMode === "count"
                  ? "bg-white text-[#0f172a] shadow-xs"
                  : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              Count
            </button>
          </div>
        </div>

        {/* Departments Table */}
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-[#e2e8f0] text-[12px] font-bold text-[#64748b]">
                <th className="px-3 py-3">Department</th>
                <th className="px-3 py-3 text-center">Total Beds</th>
                <th className="px-3 py-3 text-center">Available</th>
                <th className="px-3 py-3 text-center">Occupied</th>
                <th className="px-3 py-3">Occupancy Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {departments.map((dept) => {
                const occupancyPct =
                  dept.total > 0
                    ? Math.round((dept.occupied / dept.total) * 100)
                    : 0;

                return (
                  <tr
                    key={`${dept.facilityId}:${dept.id}`}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    {/* Department name with dot */}
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2.5 font-semibold text-[#0f172a]">
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
                        <td className="px-3 py-3.5 text-center font-medium text-[#0f172a]">
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
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f1f5f9]">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${dept.barColor}`}
                                style={{ width: `${occupancyPct}%` }}
                              />
                            </div>
                            <span className="w-12 text-right text-[13px] font-bold text-[#0f172a]">
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
