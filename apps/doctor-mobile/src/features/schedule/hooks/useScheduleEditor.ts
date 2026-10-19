import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMySchedulePreferences,
  getMyDoctorProfile,
  listMyDoctorFacilityRequests,
  listMyPractices,
  publishMyDoctorSchedule,
  saveMySchedulePreferences,
} from "@startup/data-access";
import type {
  ClinicPractice,
  DoctorSchedulePreferences,
} from "@startup/contracts";
import { supabase, useMobileSession } from "../../../services/supabase";
import {
  getSelectedPracticeId,
  setSelectedPracticeId,
} from "../../practices/services/selectedPractice";
import { selectedPracticeQueryKey } from "../../practices/utils/practiceQueryKeys";
import { formatDisplayDate } from "@startup/contracts";
import {
  previewTimeBlock,
  scheduleError,
  suggestConsultationDuration,
} from "../utils/schedule";
import type { Schedule } from "../../../types/doctor";
import { initialSchedule } from "../utils/scheduleDefaults";

export function useScheduleEditor({
  mode,
}: {
  mode: "clinic" | "online" | "home";
}) {
  const queryClient = useQueryClient();
  const [showScheduleHelp, setShowScheduleHelp] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setShowScheduleHelp(true);
      void queryClient.invalidateQueries({ queryKey: ["my-doctor-schedule"] });
      return () => setShowScheduleHelp(false);
    }, [queryClient, mode])
  );
  const { showToast } = useToast();
  const { profile } = useMobileSession();
  const doctorId = profile?.doctor?.id;
  const doctorProfile = useQuery({
    queryKey: ["my-doctor-profile"],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: Boolean(supabase),
  });
  const zone = doctorProfile.data?.booking_timezone;
  const practices = useQuery({
    queryKey: ["my-practices"],
    queryFn: () => listMyPractices(supabase!),
    enabled: Boolean(supabase),
  });
  const preferredPractice = useQuery({
    queryKey: selectedPracticeQueryKey(doctorId),
    queryFn: () => getSelectedPracticeId(doctorId!),
    enabled: Boolean(doctorId),
  });
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const availablePractices = practices.data as ClinicPractice[] | undefined;
  const selectedPracticeId =
    availablePractices?.find((item) => item.practice_id === practiceId)
      ?.practice_id ??
    availablePractices?.find(
      (item) => item.practice_id === preferredPractice.data
    )?.practice_id ??
    availablePractices?.[0]?.practice_id ??
    null;
  const selectedPractice = availablePractices?.find(
    (item) => item.practice_id === selectedPracticeId
  );
  const associationRequests = useQuery({
    queryKey: ["my-doctor-facility-requests"],
    queryFn: () => listMyDoctorFacilityRequests(supabase!),
    enabled: Boolean(supabase && availablePractices && !selectedPracticeId),
  });
  const requests = associationRequests.data as
    Awaited<ReturnType<typeof listMyDoctorFacilityRequests>> | undefined;
  const pendingAssociation = requests?.find(
    (item) => item.status === "pending"
  );
  const rejectedAssociation = requests?.find(
    (item) => item.status === "rejected"
  );
  const saved = useQuery({
    queryKey: ["my-doctor-schedule", selectedPracticeId],
    queryFn: () => getMySchedulePreferences(supabase!, selectedPracticeId!),
    enabled: Boolean(supabase && selectedPracticeId),
  });
  useToastFeedback({
    error: practices.isError
      ? "Could not load your clinics."
      : saved.isError
        ? "Could not load saved schedule."
        : "",
  });
  const [draft, setDraft] = useState<Schedule>(() => initialSchedule(mode));
  const dirty = useRef(false);
  const draftVersion = useRef(0);
  const draftPractice = useRef<string | null>(null);
  const applySchedule = useCallback(
    (p: DoctorSchedulePreferences) => {
      dirty.current = false;
      draftVersion.current = Number(p.row_version);
      draftPractice.current = p.practice_id;
      setDraft({
        days: (mode === "online"
          ? (p.online_working_days ?? p.working_days)
          : mode === "home"
            ? (p.home_working_days ?? p.working_days)
            : p.working_days
        ).map((day) => day - 1),
        start: (mode === "online"
          ? (p.online_start ?? "13:00")
          : mode === "home"
            ? (p.home_start ?? "16:00")
            : p.clinic_start
        ).slice(0, 5),
        end: (mode === "online"
          ? (p.online_end ?? "15:00")
          : mode === "home"
            ? (p.home_end ?? "17:00")
            : p.clinic_end
        ).slice(0, 5),
        duration: p.slot_minutes,
        onlineDuration: p.online_slot_minutes,
        homeDuration: p.home_slot_minutes,
        online: p.online_daily_limit,
        walkIn: p.walkin_daily_limit,
        autoAccept: p.auto_accept,
        autoLimit: p.auto_accept_limit,
        homeVisits: p.home_visits,
        homeRadius: p.home_radius_km === null ? "" : String(p.home_radius_km),
        onlineFee: String((p.online_fee_minor ?? 0) / 100),
        clinicFee: String(p.clinic_fee_minor / 100),
        homeFee: String((p.home_fee_minor ?? 0) / 100),
      });
    },
    [mode]
  );
  useEffect(() => {
    if (
      saved.data &&
      (!dirty.current || draftPractice.current !== selectedPracticeId)
    )
      applySchedule(saved.data);
    else if (
      !saved.isLoading &&
      !saved.isError &&
      draftPractice.current !== selectedPracticeId
    ) {
      dirty.current = false;
      draftVersion.current = 0;
      draftPractice.current = selectedPracticeId;
      setDraft(initialSchedule(mode));
    }
  }, [
    saved.data,
    saved.isLoading,
    saved.isError,
    selectedPracticeId,
    applySchedule,
    mode,
  ]);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [availabilityDuration, setAvailabilityDuration] = useState<
    number | null
  >(null);
  const [showAutoBookingHelp, setShowAutoBookingHelp] = useState(false);
  const [suggestedDuration, setSuggestedDuration] = useState<number | null>(
    null
  );
  const [effectiveDate, setEffectiveDate] = useState("");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone || "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const startsFrom =
    effectiveDate && effectiveDate >= today ? effectiveDate : today;
  useEffect(() => {
    setEffectiveDate("");
    setSuggestedDuration(null);
  }, [selectedPracticeId, mode]);
  const dailyLimit = mode === "online" ? draft.online : draft.walkIn;
  const suggestion = suggestConsultationDuration(
    draft.start,
    draft.end,
    dailyLimit
  );
  const suggestedTimes = suggestedDuration
    ? previewTimeBlock(draft.start, draft.end, suggestedDuration)
    : [];
  const update = (changes: Partial<Schedule>) => {
    dirty.current = true;
    setDraft((current) => ({ ...current, ...changes }));
  };
  const scheduleSettings = () => ({
    workingDays:
      mode === "clinic"
        ? draft.days.map((day) => day + 1)
        : (saved.data?.working_days ?? [1, 2, 3, 4, 5]),
    onlineWorkingDays:
      mode === "online"
        ? draft.days.map((day) => day + 1)
        : (saved.data?.online_working_days ?? [1, 2, 3, 4, 5]),
    homeWorkingDays:
      mode === "home"
        ? draft.days.map((day) => day + 1)
        : (saved.data?.home_working_days ?? [1, 2, 3, 4, 5]),
    clinicStart:
      mode === "clinic"
        ? draft.start
        : (saved.data?.clinic_start.slice(0, 5) ?? "09:00"),
    clinicEnd:
      mode === "clinic"
        ? draft.end
        : (saved.data?.clinic_end.slice(0, 5) ?? "17:00"),
    onlineStart:
      mode === "online"
        ? draft.start
        : (saved.data?.online_start?.slice(0, 5) ?? "13:00"),
    onlineEnd:
      mode === "online"
        ? draft.end
        : (saved.data?.online_end?.slice(0, 5) ?? "15:00"),
    homeStart:
      mode === "home"
        ? draft.start
        : (saved.data?.home_start?.slice(0, 5) ?? "16:00"),
    homeEnd:
      mode === "home"
        ? draft.end
        : (saved.data?.home_end?.slice(0, 5) ?? "17:00"),
    slotMinutes: draft.duration,
    onlineSlotMinutes: draft.onlineDuration,
    homeSlotMinutes: draft.homeDuration,
    onlineDailyLimit: draft.online,
    walkinDailyLimit: draft.walkIn,
    autoAccept: draft.autoAccept,
    autoAcceptLimit: draft.autoAccept ? draft.autoLimit : 0,
    homeVisits: draft.homeVisits,
    homeRadiusKm: draft.homeRadius ? Number(draft.homeRadius) : null,
    onlineFeeMinor: Math.round(Number(draft.onlineFee) * 100),
    clinicFeeMinor: Math.round(Number(draft.clinicFee) * 100),
    homeFeeMinor: Math.round(Number(draft.homeFee) * 100),
  });
  async function save() {
    const problem = scheduleError(draft, mode);
    if (problem) {
      showToast({ title: "Schedule error", message: problem, type: "error" });
      return;
    }
    if (!supabase || !selectedPracticeId || busy) return;
    setBusy(true);
    setPendingAction("save");
    try {
      const publication = selectedPractice?.verified
        ? await publishMyDoctorSchedule(
            supabase,
            selectedPracticeId,
            mode,
            scheduleSettings(),
            draftVersion.current,
            startsFrom
          )
        : null;
      const settings =
        publication?.settings ??
        (await saveMySchedulePreferences(
          supabase,
          selectedPracticeId,
          scheduleSettings(),
          draftVersion.current
        ));
      applySchedule(settings);
      queryClient.setQueryData(
        ["my-doctor-schedule", selectedPracticeId],
        settings
      );
      const active = publication?.settings.published_modes?.includes(mode);
      showToast({
        title: publication
          ? active
            ? "Schedule published"
            : "Schedule paused"
          : "Schedule saved",
        message: publication
          ? active
            ? `Schedule published from ${formatDisplayDate(startsFrom)} for this practice and visit type. Existing appointments keep their times.`
            : "Future unbooked slots are withdrawn. Existing appointments keep their times."
          : "Publish after your practice is verified.",
        type: "success",
      });
    } catch (cause) {
      if (
        typeof cause === "object" &&
        cause !== null &&
        "code" in cause &&
        cause.code === "PT409"
      ) {
        const latest = await saved.refetch();
        if (latest.data) applySchedule(latest.data);
        showToast({
          title: "Schedule changed",
          message:
            "Another app updated this schedule. Review the latest settings and publish again.",
          type: "error",
        });
      } else
        showToast({
          title: "Could not publish schedule",
          message: cause instanceof Error ? cause.message : "Try again.",
          type: "error",
        });
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }
  function selectPractice(practice: ClinicPractice) {
    setPracticeId(practice.practice_id);
    if (doctorId && practice.is_clinician && practice.verified)
      void setSelectedPracticeId(doctorId, practice.practice_id)
        .then(() =>
          queryClient.setQueryData(
            selectedPracticeQueryKey(doctorId),
            practice.practice_id
          )
        )
        .catch(() =>
          showToast({
            title: "Could not remember practice",
            type: "error",
          })
        );
  }
  return {
    selectPractice,
    queryClient,
    showScheduleHelp,
    setShowScheduleHelp,
    showToast,
    doctorId,
    doctorProfile,
    zone,
    practices,
    setPracticeId,
    selectedPracticeId,
    selectedPractice,
    associationRequests,
    pendingAssociation,
    rejectedAssociation,
    saved,
    draft,
    busy,
    pendingAction,
    availabilityDuration,
    setAvailabilityDuration,
    showAutoBookingHelp,
    setShowAutoBookingHelp,
    suggestedDuration,
    setSuggestedDuration,
    setEffectiveDate,
    today,
    startsFrom,
    dailyLimit,
    suggestion,
    suggestedTimes,
    update,
    save,
  };
}
