"use client";
import type { DoctorSchedulesScreenProps } from "../types/doctorSchedulesScreen";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "@startup/web-ui/components/ui/toast";
import { facilityDayKey, facilitySchedule } from "../utils/facilitySchedule";
export function useDoctorSchedules({
  doctors,
  sessions,
  loadError,
}: DoctorSchedulesScreenProps) {
  React.useEffect(() => {
    if (loadError)
      toast.add({
        title: "Could not load doctor schedules",
        description: loadError,
        type: "error",
      });
  }, [loadError]);
  const [selectedDay, setSelectedDay] = React.useState(() =>
    facilityDayKey(new Date())
  );
  const router = useRouter();
  const schedule = facilitySchedule(doctors, sessions, new Date(), selectedDay);

  return { selectedDay, setSelectedDay, router, schedule };
}
