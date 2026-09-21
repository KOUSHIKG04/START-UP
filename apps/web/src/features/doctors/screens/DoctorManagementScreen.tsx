"use client";

import { useDoctorDirectory } from "../hooks/useDoctorDirectory";
import { doctorManagementSummary } from "../utils/doctorManagementConstants";
import {
  Search,
  UserCheck,
  Award,
  Stethoscope,
} from "lucide-react";
import { DoctorTable } from "../components/DoctorTable";
import { AddDoctorCard } from "../components/AddDoctorCard";

export default function DoctorManagementScreen() {
  const {
    searchTerm,
    setSearchTerm,
    filteredDoctors,
    isLoading,
    total,
    refetch,
  } = useDoctorDirectory();

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* TopBar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#0f172a] tracking-tight">
            Doctor Management
          </h1>
          <p className="text-[13px] text-[#475569] mt-0.5">
            Add, verify, and manage clinical staff and department assignments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg w-64 shadow-xs">
            <Search className="size-4 text-[#94a3b8] shrink-0" />
            <input
              type="text"
              aria-label="Search by doctor or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by doctor or ID..."
              className="bg-transparent text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none w-full"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">
              Total Doctors
            </p>
            <h3 className="text-[28px] font-bold text-[#0f172a] mt-1">
              {doctorManagementSummary.total}
            </h3>
          </div>
          <div className="size-10 rounded-lg bg-[#e6f4f5] text-[#07595d] flex items-center justify-center">
            <UserCheck className="size-5" />
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">
              Active on Duty
            </p>
            <h3 className="text-[28px] font-bold text-[#10b981] mt-1">
              {doctorManagementSummary.active}
            </h3>
          </div>
          <div className="size-10 rounded-lg bg-[#ecfdf5] text-[#10b981] flex items-center justify-center">
            <Stethoscope className="size-5" />
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#475569]">
              Verified Licenses
            </p>
            <h3 className="text-[28px] font-bold text-[#3b82f6] mt-1">
              {doctorManagementSummary.verified}
            </h3>
          </div>
          <div className="size-10 rounded-lg bg-[#eff6ff] text-[#3b82f6] flex items-center justify-center">
            <Award className="size-5" />
          </div>
        </div>
      </div>

      {/* Main Content Split: Roster Table + Add Doctor Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Doctor Roster Table (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0] mb-4">
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
        <div className="lg:col-span-5 flex justify-center w-full">
          <AddDoctorCard onSuccess={() => refetch()} showOuterHeader={true} />
        </div>
      </div>
    </div>
  );
}
