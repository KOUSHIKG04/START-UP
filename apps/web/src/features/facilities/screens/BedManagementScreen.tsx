"use client";

import { useBedManagement } from "../hooks/useBedManagement";
import { bedManagementDateLabel, bedsUnderMaintenance } from "../utils/bedManagementConstants";
import {
  Search,
  Bell,
  Calendar,
  Bed,
  Check,
  User,
  Wrench,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function BedManagementScreen() {
  const {
    viewMode,
    setViewMode,
    departments,
    handleAdjustAvailable,
    totalBeds,
    totalAvailable,
    totalOccupied,
    availPercent,
    occPercent,
  } = useBedManagement();

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* TopBar (Figma 832:56) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#0f172a] tracking-tight">
            Bed Management
          </h1>
          <p className="text-[13px] text-[#475569] mt-0.5">
            Monitor and manage hospital bed allocation
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg w-56 shadow-xs">
            <Search className="size-4 text-[#94a3b8] shrink-0" />
            <input
              type="text"
              placeholder="Search patient, doctor..."
              className="bg-transparent text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none w-full"
            />
          </div>

          {/* Bell button */}
          <button className="size-9 rounded-lg bg-white border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:bg-slate-50 transition-colors shadow-xs cursor-pointer">
            <Bell className="size-4" />
          </button>

          {/* Date Badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg shadow-xs">
            <Calendar className="size-4 text-[#475569] shrink-0" />
            <span className="text-[13px] font-semibold text-[#475569] whitespace-nowrap">
              {bedManagementDateLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Row (Figma 832:71) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Beds */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#475569]">
                Total Beds
              </p>
              <h3 className="text-[28px] font-bold text-[#0f172a] leading-none mt-2">
                {totalBeds}
              </h3>
            </div>
            <div className="size-10 rounded-lg bg-[#f1f5f9] flex items-center justify-center text-slate-600 shrink-0">
              <Bed className="size-5" />
            </div>
          </div>
        </div>

        {/* Available */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#475569]">
                Available
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-[28px] font-bold text-[#10b981] leading-none">
                  {totalAvailable}
                </h3>
                <span className="text-[12px] text-[#10b981] font-semibold">
                  {availPercent}% available
                </span>
              </div>
            </div>
            <div className="size-10 rounded-lg bg-[#ecfdf5] flex items-center justify-center text-[#10b981] shrink-0">
              <Check className="size-5 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Occupied */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#475569]">Occupied</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-[28px] font-bold text-[#3b82f6] leading-none">
                  {totalOccupied}
                </h3>
                <span className="text-[12px] text-[#3b82f6] font-semibold">
                  {occPercent}% occupied
                </span>
              </div>
            </div>
            <div className="size-10 rounded-lg bg-[#eff6ff] flex items-center justify-center text-[#3b82f6] shrink-0">
              <User className="size-5" />
            </div>
          </div>
        </div>

        {/* Under Maintenance */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#475569]">
                Under Maintenance
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-[28px] font-bold text-[#f59e0b] leading-none">
                  {bedsUnderMaintenance}
                </h3>
                <span className="text-[12px] text-[#f59e0b] font-semibold">
                  1.5% offline
                </span>
              </div>
            </div>
            <div className="size-10 rounded-lg bg-[#fffbeb] flex items-center justify-center text-[#f59e0b] shrink-0">
              <Wrench className="size-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Bed Availability by Department (Figma 832:86) */}
      <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-xs">
        {/* Header & Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#e2e8f0]">
          <div>
            <h2 className="text-[18px] font-bold text-[#0f172a]">
              Bed Availability by Department
            </h2>
            <p className="text-[13px] text-[#475569] mt-0.5">
              Overall occupancy rate across departments
            </p>
          </div>

          {/* % Percentage / Count Switch */}
          <div className="inline-flex items-center p-1 bg-[#f1f5f9] rounded-lg self-start sm:self-auto border border-[#e2e8f0]">
            <button
              onClick={() => setViewMode("percent")}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer ${
                viewMode === "percent"
                  ? "bg-white text-[#0f172a] shadow-xs"
                  : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              % Percentage
            </button>
            <button
              onClick={() => setViewMode("count")}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer ${
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
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-[14px] border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-[#e2e8f0] text-[#64748b] text-[12px] font-bold">
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3 text-center">Total Beds</th>
                <th className="py-3 px-3 text-center">Available</th>
                <th className="py-3 px-3 text-center">Occupied</th>
                <th className="py-3 px-3">Occupancy Rate</th>
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
                    key={dept.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Department name with dot */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5 font-semibold text-[#0f172a]">
                        <span
                          className={`size-2.5 rounded-full ${dept.dotColor} shrink-0`}
                        />
                        <span>{dept.name}</span>
                      </div>
                    </td>

                    {/* Total Beds */}
                    <td className="py-3.5 px-3 text-center font-medium text-[#0f172a]">
                      {dept.total}
                    </td>

                    {/* Available with Stepper (- / +) */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex items-center border border-[#cbd5e1] rounded-md bg-white shadow-2xs overflow-hidden">
                        <button
                          onClick={() => handleAdjustAvailable(dept.id, -1)}
                          disabled={dept.available <= 0}
                          className="px-2 py-1 text-[#64748b] hover:bg-slate-100 hover:text-[#0f172a] disabled:opacity-30 disabled:pointer-events-none transition-colors border-r border-[#cbd5e1] cursor-pointer"
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                        <span className="w-10 text-center font-semibold text-[#0f172a] text-[13px]">
                          {dept.available}
                        </span>
                        <button
                          onClick={() => handleAdjustAvailable(dept.id, 1)}
                          disabled={dept.available >= dept.total}
                          className="px-2 py-1 text-[#64748b] hover:bg-slate-100 hover:text-[#0f172a] disabled:opacity-30 disabled:pointer-events-none transition-colors border-l border-[#cbd5e1] cursor-pointer"
                        >
                          <ChevronUp className="size-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Occupied */}
                    <td className="py-3.5 px-3 text-center font-semibold text-[#0f172a]">
                      {dept.occupied}
                    </td>

                    {/* Occupancy Rate Bar & Label */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-4 max-w-[280px]">
                        <div className="flex-1 bg-[#f1f5f9] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${dept.barColor}`}
                            style={{ width: `${occupancyPct}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-bold text-[#0f172a] text-[13px]">
                          {viewMode === "percent"
                            ? `${occupancyPct}%`
                            : `${dept.occupied}/${dept.total}`}
                        </span>
                      </div>
                    </td>
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
