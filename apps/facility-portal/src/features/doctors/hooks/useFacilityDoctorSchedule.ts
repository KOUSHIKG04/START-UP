"use client";

import type { FacilityDoctorScheduleEditorProps } from "../types/facilityDoctorScheduleEditor";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@startup/web-ui/components/ui/toast";
import {
  doctorScheduleSettingsSchema,
  formatDisplayDate,
  type DoctorScheduleSettings,
} from "@startup/contracts";
import {
  loadFacilityDoctorSchedule,
  publishFacilityDoctorSchedule,
} from "../server/scheduleActions";
import { initialSettings } from "../utils/facilityScheduleEditorConstants";
import { settingsDraft } from "../utils/scheduleDraft";
import {
  previewClocks,
  suggestConsultationDuration,
} from "../utils/scheduleEditor";

export function useFacilityDoctorSchedule({
  practiceId,
  mode,
}: FacilityDoctorScheduleEditorProps) {
  const client = useQueryClient();
  const router = useRouter();
  const schedule = useQuery({
    queryKey: ["facility-practice-schedule", practiceId],
    queryFn: () => loadFacilityDoctorSchedule(practiceId),
  });
  const result = schedule.data as
    Awaited<ReturnType<typeof loadFacilityDoctorSchedule>> | undefined;
  const saved = result?.ok ? result.settings : null;
  const daysKey: "workingDays" | "onlineWorkingDays" | "homeWorkingDays" =
    mode === "online"
      ? "onlineWorkingDays"
      : mode === "home"
        ? "homeWorkingDays"
        : "workingDays";
  const startKey: "clinicStart" | "onlineStart" | "homeStart" =
    mode === "online"
      ? "onlineStart"
      : mode === "home"
        ? "homeStart"
        : "clinicStart";
  const endKey: "clinicEnd" | "onlineEnd" | "homeEnd" =
    mode === "online" ? "onlineEnd" : mode === "home" ? "homeEnd" : "clinicEnd";
  const durationKey: "slotMinutes" | "onlineSlotMinutes" | "homeSlotMinutes" =
    mode === "online"
      ? "onlineSlotMinutes"
      : mode === "home"
        ? "homeSlotMinutes"
        : "slotMinutes";
  const limitKey: "walkinDailyLimit" | "onlineDailyLimit" =
    mode === "online" ? "onlineDailyLimit" : "walkinDailyLimit";
  const feeKey: "clinicFeeMinor" | "onlineFeeMinor" | "homeFeeMinor" =
    mode === "online"
      ? "onlineFeeMinor"
      : mode === "home"
        ? "homeFeeMinor"
        : "clinicFeeMinor";
  const [edits, setEdits] = useState<{
    version: number;
    settings: DoctorScheduleSettings;
  } | null>(null);
  const version = edits?.version ?? Number(saved?.row_version ?? 0);
  const draft =
    edits?.settings ??
    (saved ? settingsDraft(saved) : { ...initialSettings, [daysKey]: [] });
  const [pending, startTransition] = useTransition();
  const [showScheduleHelp, setShowScheduleHelp] = useState(true);
  const [showAutoBookingHelp, setShowAutoBookingHelp] = useState(false);
  const [availabilityDuration, setAvailabilityDuration] = useState<
    number | null
  >(null);
  const [suggestedDuration, setSuggestedDuration] = useState<number | null>(
    null
  );
  const [effectiveDate, setEffectiveDate] = useState("");
  const zone = result?.ok ? result.doctor.booking_timezone : undefined;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone || "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const startsFrom =
    effectiveDate && effectiveDate >= today ? effectiveDate : today;
  const serviceDays = draft[daysKey] ?? draft.workingDays;
  const duration = draft[durationKey];
  const blocksKey =
    mode === "clinic"
      ? "clinicTimeBlocks"
      : mode === "online"
        ? "onlineTimeBlocks"
        : "homeTimeBlocks";
  const timeBlocks = draft[blocksKey] ?? [
    { start: draft[startKey] ?? "", end: draft[endKey] ?? "" },
  ];
  const suggestion = suggestConsultationDuration(
    draft[startKey] ?? "",
    draft[endKey] ?? "",
    draft[limitKey],
    timeBlocks
  );
  const suggestedTimes = suggestedDuration
    ? timeBlocks.flatMap((block) =>
        previewClocks(block.start, block.end, suggestedDuration)
      )
    : [];
  const update = (changes: Partial<DoctorScheduleSettings>) =>
    setEdits({ version, settings: { ...draft, ...changes } });
  const fail = (message: string) =>
    toast.add({
      title: "Schedule action failed",
      description: message,
      type: "error",
    });
  const fee = draft[feeKey];
  const feeLabel =
    mode === "clinic"
      ? "Clinic Visit"
      : mode === "online"
        ? "Online Consultation"
        : "Home Visit";

  const validate = () => {
    if (!serviceDays.length) return "Select at least one working day.";
    const start = draft[startKey] ?? "";
    const end = draft[endKey] ?? "";
    if (!start || !end || end <= start)
      return "End time must be after start time.";
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    if (endHour * 60 + endMinute - startHour * 60 - startMinute < duration)
      return "Working hours must fit at least one appointment slot.";
    if (draft.autoAccept && draft.autoAcceptLimit < 1)
      return "Choose a daily auto-booking limit from 1 to 100.";
    if (
      mode === "home" &&
      draft.homeVisits &&
      (!draft.homeRadiusKm || draft.homeRadiusKm <= 0)
    )
      return "Enter a positive home-visit travel radius in km.";
    const parsed = doctorScheduleSettingsSchema.safeParse(draft);
    return parsed.success
      ? null
      : (parsed.error.issues[0]?.message ?? "Check the schedule fields.");
  };
  const save = () => {
    if (pending) return;
    const problem = validate();
    if (problem) {
      fail(problem);
      return;
    }
    startTransition(async () => {
      const response = await publishFacilityDoctorSchedule(
        practiceId,
        mode,
        draft,
        version,
        startsFrom
      );
      if (!response.ok) {
        if (response.error.includes("Schedule changed")) {
          await schedule.refetch();
          setEdits(null);
        }
        fail(response.error);
        return;
      }
      client.setQueryData(["facility-practice-schedule", practiceId], {
        ...result,
        settings: response.settings,
      });
      setEdits(null);
      await client.invalidateQueries({
        queryKey: ["facility-practice-schedule", practiceId],
      });
      router.refresh();
      toast.add({
        title: response.settings.published_modes?.includes(mode)
          ? "Schedule published"
          : "Schedule paused",
        description: response.settings.published_modes?.includes(mode)
          ? `Schedule published from ${formatDisplayDate(startsFrom)} for this practice and visit type. Existing appointments keep their times.`
          : "Future unbooked slots are withdrawn. Existing appointments keep their times.",
        type: "success",
      });
    });
  };

  return {
    schedule,
    result,
    saved,
    daysKey,
    startKey,
    endKey,
    durationKey,
    limitKey,
    feeKey,
    draft,
    pending,
    showScheduleHelp,
    setShowScheduleHelp,
    showAutoBookingHelp,
    setShowAutoBookingHelp,
    availabilityDuration,
    setAvailabilityDuration,
    suggestedDuration,
    setSuggestedDuration,
    setEffectiveDate,
    zone,
    today,
    startsFrom,
    serviceDays,
    duration,
    suggestion,
    suggestedTimes,
    update,
    fee,
    feeLabel,
    save,
  };
}
