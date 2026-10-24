"use client";

import type { FormEvent } from "react";
import { toast } from "@startup/web-ui/components/ui/toast";
import {
  addFacilityDoctorUnavailability,
  removeFacilityDoctorUnavailability,
} from "../server/scheduleActions";
import { practiceSlotIso } from "../utils/scheduleEditor";
import type { FacilityUnavailableTimeProps } from "../types/facilityUnavailableTime";
import type { Scope } from "../types/facilityUnavailableTime";
import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { loadFacilityDoctorSchedule } from "../server/scheduleActions";
import { unavailableServiceOptions as scopes } from "../utils/facilityScheduleEditorConstants";

export function useFacilityUnavailableTime({
  practiceId,
}: FacilityUnavailableTimeProps) {
  const client = useQueryClient();
  const schedule = useQuery({
    queryKey: ["facility-practice-schedule", practiceId],
    queryFn: () => loadFacilityDoctorSchedule(practiceId),
  });

  const [selectedScopes, setScopes] = useState<Scope[]>(["all"]);
  function toggleScope(value: Scope) {
    setScopes((current) => {
      if (value === "all") return ["all"];
      const services = current.filter((item) => item !== "all");
      const next = services.includes(value)
        ? services.filter((item) => item !== value)
        : [...services, value];
      return next.length === 0 || next.length === 3 ? ["all"] : next;
    });
  }
  const scopeLabel = selectedScopes.includes("all")
    ? "all services"
    : scopes
        .filter(([value]) => selectedScopes.includes(value))
        .map(([, label]) => label)
        .join(" and ");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const result = schedule.data as
    Awaited<ReturnType<typeof loadFacilityDoctorSchedule>> | undefined;
  const zone = result?.ok ? result.doctor.booking_timezone : null;
  const fail = (description: string) =>
    toast.add({
      title: "Unavailable time could not be updated",
      description,
      type: "error",
    });

  function addUnavailableTime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!zone) return;
    const day = date;
    if (!day) {
      fail("Choose a date.");
      return;
    }
    try {
      const startsAt = practiceSlotIso(day, start, zone);
      const nextDay = new Date(Date.parse(day + "T00:00:00Z") + 86400000)
        .toISOString()
        .slice(0, 10);
      const endsAt =
        end === "24:00"
          ? practiceSlotIso(nextDay, "00:00", zone)
          : practiceSlotIso(day, end, zone);
      if (endsAt <= startsAt)
        throw new Error("End time must be after start time.");
      startTransition(async () => {
        const response = await addFacilityDoctorUnavailability({
          practiceId,
          startsAt,
          endsAt,
          reason,
          serviceModes: selectedScopes,
        });
        if (!response.ok) {
          fail(response.error);
          return;
        }
        setDate("");
        setStart("");
        setEnd("");
        setReason("");
        await client.invalidateQueries({
          queryKey: ["facility-practice-schedule", practiceId],
        });
        toast.add({ title: "Unavailable time saved", type: "success" });
      });
    } catch (cause) {
      fail(
        cause instanceof Error ? cause.message : "Check the date and hours."
      );
    }
  }
  function removeUnavailableTime(item: {
    id: string;
    row_version: string | number;
  }) {
    return startTransition(async () => {
      const response = await removeFacilityDoctorUnavailability(
        practiceId,
        item.id,
        Number(item.row_version)
      );
      if (!response.ok) {
        fail(response.error);
        return;
      }
      await client.invalidateQueries({
        queryKey: ["facility-practice-schedule", practiceId],
      });
    });
  }
  return {
    addUnavailableTime,
    removeUnavailableTime,
    client,
    schedule,
    selectedScopes,
    toggleScope,
    scopeLabel,
    date,
    setDate,
    start,
    setStart,
    end,
    setEnd,
    reason,
    setReason,
    pending,
    startTransition,
    result,
    zone,
    fail,
  };
}
