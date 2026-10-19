"use client";
import { scheduleServices } from "../utils/facilityDoctorScheduleConstants";

import { FacilityDoctorScheduleEditor } from "../components/FacilityDoctorScheduleEditor";

import type { FacilityDoctorScheduleScreenProps } from "../types/facilityDoctorScheduleScreen";

import Link from "next/link";

import { ChevronRight } from "lucide-react";

import { FacilityUnavailableTime } from "../components/FacilityUnavailableTime";

export function FacilityDoctorScheduleScreen({
  practiceId,
  mode,
}: FacilityDoctorScheduleScreenProps) {
  if (mode)
    return (
      <FacilityDoctorScheduleEditor
        key={`${practiceId}:${mode}`}
        practiceId={practiceId}
        mode={mode}
      />
    );
  return (
    <div className="w-full max-w-full min-w-0 space-y-6">
      <h1 className="text-2xl font-bold">Manage Schedule</h1>
      <div className="grid w-full min-w-0 grid-cols-1 gap-4">
        {scheduleServices.map(([service, title, description, Icon]) => (
          <Link
            key={service}
            href={`/doctor-schedules/${practiceId}/${service}`}
            className="flex min-h-20 items-center gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 hover:bg-[#f8fafc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008577]"
          >
            <Icon className="size-6 shrink-0 text-[#008577]" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-[#475569]">{description}</p>
            </div>
            <ChevronRight className="size-5 text-[#64748b]" />
          </Link>
        ))}
        <FacilityUnavailableTime practiceId={practiceId} />
      </div>
    </div>
  );
}
