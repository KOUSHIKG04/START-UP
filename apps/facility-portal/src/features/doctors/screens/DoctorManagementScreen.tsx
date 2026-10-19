"use client";
import { useDoctorManagement } from "../hooks/useDoctorManagement";

import type { DoctorManagementScreenProps } from "../types/doctorManagementScreen";

import { Search, UserCheck, Award, Stethoscope } from "lucide-react";
import { DoctorTable } from "../components/DoctorTable";
import { AddDoctorCard } from "../components/AddDoctorCard";
import { FacilityDoctorRequests } from "../components/FacilityDoctorRequests";

export default function DoctorManagementScreen({
  facilityIds,
}: DoctorManagementScreenProps) {
  const {
    searchTerm,
    setSearchTerm,
    filteredDoctors,
    isLoading,
    total,
    refetch,
    doctorManagementSummary,
  } = useDoctorManagement();
  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* TopBar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Doctor Management
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="border-border bg-card flex w-64 items-center gap-2 rounded-lg border px-3 py-2 shadow-xs">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <input
              type="text"
              aria-label="Search by doctor or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by doctor or ID..."
              className="text-foreground placeholder-muted-foreground focus-visible:ring-primary focus-visible:ring-offset-background w-full bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-5 shadow-2xs">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              Total Doctors
            </p>
            <h3 className="text-foreground mt-1 text-3xl font-bold">
              {doctorManagementSummary.total}
            </h3>
          </div>
          <div className="bg-muted text-primary flex size-10 items-center justify-center rounded-lg">
            <UserCheck className="size-5" />
          </div>
        </div>

        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-5 shadow-2xs">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              Active on Duty
            </p>
            <h3 className="text-primary mt-1 text-3xl font-bold">
              {doctorManagementSummary.active}
            </h3>
          </div>
          <div className="bg-muted text-primary flex size-10 items-center justify-center rounded-lg">
            <Stethoscope className="size-5" />
          </div>
        </div>

        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-5 shadow-2xs">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              Verified Licenses
            </p>
            <h3 className="text-primary mt-1 text-3xl font-bold">
              {doctorManagementSummary.verified}
            </h3>
          </div>
          <div className="bg-muted text-primary flex size-10 items-center justify-center rounded-lg">
            <Award className="size-5" />
          </div>
        </div>
      </div>

      {/* Main Content Split: Roster Table + Add Doctor Card */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left: Doctor Roster Table (7 cols) */}
        <div className="border-border bg-card flex flex-col justify-between rounded-lg border p-6 shadow-xs lg:col-span-7">
          <div>
            <div className="border-border mb-4 flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-foreground text-lg font-bold">
                  Doctor Directory
                </h2>
                <p className="text-muted-foreground text-sm">
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
