"use client";

import { useEffect } from "react";
import { toast } from "@startup/web-ui/components/ui/toast";
import { useDoctorDirectory } from "../hooks/useDoctorDirectory";
import { Search, UserCheck, Award, Stethoscope } from "lucide-react";
import { DoctorTable } from "../components/DoctorTable";
import { AddDoctorCard } from "../components/AddDoctorCard";
import { FacilityDoctorRequests } from "../components/FacilityDoctorRequests";

export default function DoctorManagementScreen({
  facilityIds,
}: {
  facilityIds: string[];
}) {
  const {
    searchTerm,
    setSearchTerm,
    filteredDoctors,
    isLoading,
    total,
    refetch,
    isError,
    error,
    summary: doctorManagementSummary,
  } = useDoctorDirectory();
  useEffect(() => {
    if (isError)
      toast.add({
        title: "Could not load doctors",
        description:
          error instanceof Error
            ? error.message
            : "Doctor directory is unavailable.",
        type: "error",
      });
  }, [isError, error]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* TopBar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#0f172a]">
            Doctor Management
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex w-64 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 shadow-xs">
            <Search className="size-4 shrink-0 text-[#94a3b8]" />
            <input
              type="text"
              aria-label="Search by doctor or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by doctor or ID..."
              className="w-full bg-transparent text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none"
            />
          </div>
        </div>
      </div>

      <FacilityDoctorRequests
        scope={[...facilityIds].sort().join(":")}
        onChange={() => void refetch()}
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">
              Total Doctors
            </p>
            <h3 className="mt-1 text-[28px] font-bold text-[#0f172a]">
              {doctorManagementSummary.total}
            </h3>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#e6f4f5] text-[#07595d]">
            <UserCheck className="size-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">
              Active on Duty
            </p>
            <h3 className="mt-1 text-[28px] font-bold text-[#10b981]">
              {doctorManagementSummary.active}
            </h3>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#10b981]">
            <Stethoscope className="size-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-2xs">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">
              Verified Licenses
            </p>
            <h3 className="mt-1 text-[28px] font-bold text-[#3b82f6]">
              {doctorManagementSummary.verified}
            </h3>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#eff6ff] text-[#3b82f6]">
            <Award className="size-5" />
          </div>
        </div>
      </div>

      {/* Main Content Split: Roster Table + Add Doctor Card */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left: Doctor Roster Table (7 cols) */}
        <div className="flex flex-col justify-between rounded-[16px] border border-[#e2e8f0] bg-white p-6 shadow-xs lg:col-span-7">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-[#e2e8f0] pb-4">
              <div>
                <h2 className="text-[18px] font-bold text-[#0f172a]">
                  Doctor Directory
                </h2>
                <p className="text-[13px] text-[#475569]">
                  {total} doctors currently registered
                </p>
              </div>
            </div>

            <DoctorTable data={filteredDoctors} isLoading={isLoading} />
          </div>
        </div>

        {/* Right: Add Doctor Card (Figma 939:12) (5 cols) */}
        <div className="flex w-full justify-center lg:col-span-5">
          <AddDoctorCard onSuccess={() => refetch()} showOuterHeader={true} />
        </div>
      </div>
    </div>
  );
}
