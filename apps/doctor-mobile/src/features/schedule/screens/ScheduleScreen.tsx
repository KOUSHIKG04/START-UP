import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, Switch, View } from "react-native";
import {
  Button,
  ClockDurationPicker,
  Input,
  Loader,
  ModalSurface,
  Skeleton,
  useToast,
  useToastFeedback,
} from "@startup/mobile-ui";
import { Calendar, Check, Minus, Plus } from "lucide-react-native";
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
  selectedPracticeQueryKey,
  setSelectedPracticeId,
} from "../../practices/selectedPractice";
import {
  Choice,
  DoctorScreen,
  Heading,
  Label,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { DatePicker } from "../../../components/DatePicker";
import { formatDisplayDate } from "@startup/contracts";
import {
  previewTimeBlock,
  scheduleError,
  suggestConsultationDuration,
} from "../utils/schedule";
import type { Schedule } from "../../../types/doctor";
import {
  ConsultationChargesPanel,
  ScheduleSection,
  WorkingDaysPanel,
  ClinicHoursPanel,
} from "../components/ScheduleOperationsPanels";

function NumberSetting({
  title,
  value,
  min,
  max,
  suffix,
  onChange,
  stepper = false,
  disabled = false,
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
  stepper?: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const parsed = /^\d+$/.test(text) ? Number(text) : NaN;
  const current =
    Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : value;
  const commit = (next: number) => {
    const bounded = Math.max(min, Math.min(max, next));
    setText(String(bounded));
    onChange(bounded);
  };
  return (
    <View style={{ gap: 6 }}>
      <View style={ui.between}>
        <Label
          style={{ fontSize: 13, lineHeight: 20, includeFontPadding: false }}
        >
          {title}
        </Label>
        {!stepper ? (
          <Label muted style={{ fontSize: 12 }}>
            {min}–{max} {suffix}
          </Label>
        ) : null}
      </View>
      {stepper ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${title}`}
            accessibilityState={{ disabled: disabled || current <= min }}
            disabled={disabled || current <= min}
            onPress={() => commit(current - 1)}
            style={({ pressed }) => ({
              width: 44,
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              borderRightWidth: 1,
              borderColor: palette.border,
              opacity: disabled || current <= min ? 0.3 : 1,
              backgroundColor: pressed ? palette.subtle : palette.surface,
            })}
          >
            <Minus size={20} color={palette.primary} />
          </Pressable>
          <Input
            variant="unstyled"
            accessibilityLabel={`${title} in ${suffix}`}
            value={text}
            disabled={disabled}
            style={{
              flex: 1,
              minWidth: 0,
              height: 46,
              paddingHorizontal: 0,
              paddingVertical: 0,
              textAlign: "center",
              textAlignVertical: "center",
              fontSize: 16,
              color: palette.header,
            }}
            onChangeText={(next) => {
              if (!/^\d{0,3}$/.test(next)) return;
              setText(next);
              const number = Number(next);
              if (next !== "" && number >= min && number <= max)
                onChange(number);
            }}
            onBlur={() => commit(Number.isFinite(parsed) ? parsed : value)}
            selectTextOnFocus
            keyboardType="number-pad"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Increase ${title}`}
            accessibilityState={{ disabled: disabled || current >= max }}
            disabled={disabled || current >= max}
            onPress={() => commit(current + 1)}
            style={({ pressed }) => ({
              width: 44,
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              borderLeftWidth: 1,
              borderColor: palette.border,
              opacity: disabled || current >= max ? 0.3 : 1,
              backgroundColor: pressed ? palette.subtle : palette.surface,
            })}
          >
            <Plus size={20} color={palette.primary} />
          </Pressable>
        </View>
      ) : (
        <Input
          accessibilityLabel={`${title} in ${suffix}`}
          value={text}
          onChangeText={(next) => {
            if (/^\d{0,3}$/.test(next)) {
              setText(next);
              if (next !== "") onChange(Number(next));
            }
          }}
          onBlur={() => setText(String(value))}
          selectTextOnFocus
          keyboardType="number-pad"
        />
      )}
    </View>
  );
}
function initialSchedule(mode: "clinic" | "online" | "home"): Schedule {
  return {
    days: [],
    start: mode === "online" ? "13:00" : mode === "home" ? "16:00" : "09:00",
    end: mode === "online" ? "15:00" : "17:00",
    duration: 15,
    onlineDuration: 15,
    homeDuration: 60,
    online: 8,
    walkIn: 12,
    autoAccept: false,
    autoLimit: 1,
    homeVisits: false,
    homeRadius: "",
    onlineFee: "0",
    clinicFee: "0",
    homeFee: "0",
  };
}

export function ScheduleScreen({
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
  return (
    <DoctorScreen
      title={
        mode === "clinic"
          ? "Clinic Schedule"
          : mode === "online"
            ? "Online Schedule"
            : "Home Visit Schedule"
      }
      bottomNav={false}
    >
      {practices.isLoading ? (
        <Loader theme="doctor" style={{ minHeight: 40 }} />
      ) : null}
      {practices.data && practices.data.length > 1 ? (
        <ScheduleSection title="Your clinic">
          <Label muted style={{ fontSize: 12 }}>
            Select your clinic or hospital.
          </Label>
          <View style={ui.wrap}>
            {(practices.data as ClinicPractice[]).map(
              (practice: ClinicPractice) => (
                <Choice
                  key={practice.practice_id}
                  label={practice.facility_name}
                  selected={selectedPracticeId === practice.practice_id}
                  onPress={() => {
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
                  }}
                />
              )
            )}
          </View>
        </ScheduleSection>
      ) : null}
      {selectedPractice ? (
        <Label muted>
          {selectedPractice.facility_name}
          {selectedPractice.verified ? "" : " · awaiting verification"}
        </Label>
      ) : null}
      {saved.isLoading ? (
        <Skeleton theme="doctor" height={72} radius={12} />
      ) : null}
      <WorkingDaysPanel
        selectedDays={draft.days}
        onToggleDay={(index) =>
          update({
            days: draft.days.includes(index)
              ? draft.days.filter((d) => d !== index)
              : [...draft.days, index],
          })
        }
      />
      <ClinicHoursPanel
        title={
          mode === "clinic"
            ? "Clinic Hours"
            : mode === "online"
              ? "Online Hours"
              : "Home Visit Hours"
        }
        start={draft.start}
        end={draft.end}
        onUpdate={update}
      />
      <ScheduleSection title="Appointment slots">
        <Label muted style={{ fontSize: 12 }}>
          {mode === "home"
            ? "Set your visit duration."
            : "Duration sets appointment times. The daily limit caps bookings."}
        </Label>
        <View
          style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}
        >
          {mode === "clinic" ? (
            <ClockDurationPicker
              label="Consultation duration"
              value={draft.duration}
              min={5}
              max={120}
              theme="doctor"
              disabled={busy}
              onChange={(duration) => {
                update({ duration });
                setAvailabilityDuration(duration);
              }}
            />
          ) : null}
          {mode === "online" ? (
            <ClockDurationPicker
              label="Consultation duration"
              value={draft.onlineDuration}
              min={5}
              max={120}
              theme="doctor"
              disabled={busy}
              onChange={(onlineDuration) => {
                update({ onlineDuration });
                setAvailabilityDuration(onlineDuration);
              }}
            />
          ) : null}
          {mode === "home" ? (
            <ClockDurationPicker
              label="Home-visit slot duration"
              value={draft.homeDuration}
              min={30}
              max={120}
              theme="doctor"
              disabled={busy}
              onChange={(homeDuration) => {
                update({ homeDuration });
                setAvailabilityDuration(homeDuration);
              }}
            />
          ) : null}
          {mode !== "home" ? (
            <View style={{ flex: 1, minWidth: 0 }}>
              <NumberSetting
                title="Daily booking limit"
                stepper
                disabled={busy}
                value={mode === "online" ? draft.online : draft.walkIn}
                min={0}
                max={100}
                suffix="bookings"
                onChange={(value) =>
                  update(
                    mode === "online" ? { online: value } : { walkIn: value }
                  )
                }
              />
            </View>
          ) : null}
        </View>
        {mode !== "home" ? (
          <>
            <Label muted style={{ fontSize: 12 }}>
              Changing the daily limit does not change appointment times.
            </Label>
            {!saved.data?.published_modes?.includes(mode) ? (
              <>
                <Label muted style={{ fontSize: 12 }}>
                  Preview a duration based on your hours and daily limit.
                </Label>
                <Button
                  theme="doctor"
                  variant="outline"
                  label="Suggest duration"
                  disabled={busy || suggestion === null}
                  onPress={() => setSuggestedDuration(suggestion)}
                />
              </>
            ) : null}
          </>
        ) : null}
      </ScheduleSection>
      <ScheduleSection title="Auto Accept Bookings">
        <View style={ui.between}>
          <Label>Enable automatic acceptance</Label>
          <Switch
            accessibilityLabel="Auto Accept Bookings"
            value={draft.autoAccept}
            onValueChange={(autoAccept) => update({ autoAccept })}
            trackColor={{ false: "#D1D5DB", true: palette.primary }}
          />
        </View>
        <Label muted style={{ fontSize: 12 }}>
          Set your daily auto-booking limit.
        </Label>
        {draft.autoAccept && (
          <>
            <NumberSetting
              title="Shared daily auto-accept limit"
              stepper
              disabled={busy}
              value={draft.autoLimit}
              min={1}
              max={100}
              suffix="bookings"
              onChange={(autoLimit) => update({ autoLimit })}
            />
            <Button
              theme="doctor"
              variant="outline"
              label="Set auto-booking limit"
              disabled={busy}
              onPress={() => setShowAutoBookingHelp(true)}
            />
          </>
        )}
      </ScheduleSection>
      {mode === "home" ? (
        <ScheduleSection title="Home Visit Appointments">
          <View style={ui.between}>
            <Label>Enable home visits</Label>
            <Switch
              accessibilityLabel="Home Visit Appointments"
              value={draft.homeVisits}
              onValueChange={(homeVisits) => update({ homeVisits })}
              trackColor={{ false: "#D1D5DB", true: palette.primary }}
            />
          </View>
          <Label muted style={{ fontSize: 12 }}>
            Set your home-visit travel radius.
          </Label>
          {draft.homeVisits ? (
            <Input
              label="Travel radius from practice (km)"
              accessibilityLabel="Home visit travel radius in kilometres"
              value={draft.homeRadius}
              onChangeText={(homeRadius) => update({ homeRadius })}
              keyboardType="decimal-pad"
            />
          ) : null}
        </ScheduleSection>
      ) : null}
      <ConsultationChargesPanel mode={mode} draft={draft} onUpdate={update} />
      {!selectedPracticeId && associationRequests.isLoading ? (
        <Loader theme="doctor" style={{ minHeight: 40 }} />
      ) : null}
      {!practices.isLoading &&
      !associationRequests.isLoading &&
      !selectedPracticeId ? (
        <Label muted>
          {pendingAssociation
            ? `${pendingAssociation.facility_name} must accept your doctor association in its Doctor Management portal before you can save a schedule.`
            : rejectedAssociation
              ? `Your association with ${rejectedAssociation.facility_name} was declined. Update your facility request before saving a schedule.`
              : practices.isError || associationRequests.isError
                ? "Could not load your practice status. Reopen this screen and try again."
                : "An active clinic or hospital association is required before you can save a schedule."}
        </Label>
      ) : null}
      {selectedPractice?.verified ? (
        <ScheduleSection title="Apply changes from">
          <Label muted style={{ fontSize: 12 }}>
            New appointment times apply from this date. Existing appointments
            and pending requests keep their times. Daily booking limits apply
            when saved.
          </Label>
          <DatePicker
            key={`${selectedPracticeId}:${mode}`}
            value={startsFrom}
            onChange={setEffectiveDate}
            timeZone={zone}
            minDate={today}
            disabled={busy}
            label="Start date"
          />
        </ScheduleSection>
      ) : null}
      <Button
        loading={pendingAction === "save"}
        theme="doctor"
        label={
          selectedPractice?.verified ? "Publish Schedule" : "Save Schedule"
        }
        leftIcon={<Calendar size={17} color="white" />}
        disabled={
          busy ||
          practices.isFetching ||
          saved.isFetching ||
          saved.isError ||
          !zone ||
          doctorProfile.isError ||
          !selectedPracticeId
        }
        onPress={() => void save()}
      />
      <ModalSurface
        visible={showAutoBookingHelp}
        onClose={() => setShowAutoBookingHelp(false)}
      >
        <Heading style={{ fontSize: 18 }}>Automatic bookings</Heading>
        <Label muted>
          Up to {draft.autoLimit} bookings per day are auto-accepted across
          Clinic, Online and Home visits combined.
        </Label>
        {[
          "Bookings are accepted instantly under the limit.",
          "Bookings beyond the limit need manual approval.",
        ].map((text) => (
          <View key={text} style={ui.row}>
            <Check size={14} color={palette.primary} />
            <Label muted style={{ flex: 1 }}>
              {text}
            </Label>
          </View>
        ))}
        <Button
          theme="doctor"
          label="Got it"
          onPress={() => setShowAutoBookingHelp(false)}
        />
      </ModalSurface>
      <ModalSurface
        visible={showScheduleHelp}
        onClose={() => setShowScheduleHelp(false)}
      >
        <Heading style={{ fontSize: 18 }}>Set your schedule</Heading>
        <Label muted>
          Choose working days, hours and the slot interval. Publishing creates
          the next 30 days automatically. Auto-accept uses one shared daily
          limit across all services. The daily booking limit counts active
          bookings; patients can choose any available time within your working
          hours.
        </Label>
        <Button
          theme="doctor"
          label="Got it"
          onPress={() => setShowScheduleHelp(false)}
        />
      </ModalSurface>
      <ModalSurface
        visible={availabilityDuration !== null}
        onClose={() => setAvailabilityDuration(null)}
      >
        <Heading style={{ fontSize: 18 }}>Automatic availability</Heading>
        <Label muted>
          When you publish, slots are created every {availabilityDuration}{" "}
          minutes on your selected working days. Unavailable time and existing
          appointments are respected.
        </Label>
        <Button
          theme="doctor"
          label="Got it"
          onPress={() => setAvailabilityDuration(null)}
        />
      </ModalSurface>
      <ModalSurface
        visible={suggestedDuration !== null}
        onClose={() => setSuggestedDuration(null)}
      >
        <Heading style={{ fontSize: 18 }}>
          Suggested consultation duration
        </Heading>
        <Label>{suggestedDuration} minutes per consultation</Label>
        <Label muted>
          {suggestedTimes.length} appointment times within your hours, with up
          to {dailyLimit} bookings per day.
        </Label>
        <Label muted>
          {suggestedTimes.slice(0, 4).join(" · ")}
          {suggestedTimes.length > 4 ? " …" : ""}
        </Label>
        <Label muted>
          Review this duration before publishing. Later daily-limit changes will
          not recalculate it.
        </Label>
        <Button
          theme="doctor"
          label="Use this duration"
          onPress={() => {
            if (suggestedDuration === null) return;
            update(
              mode === "online"
                ? { onlineDuration: suggestedDuration }
                : { duration: suggestedDuration }
            );
            setSuggestedDuration(null);
          }}
        />
        <Button
          theme="doctor"
          variant="outline"
          label="Keep current duration"
          onPress={() => setSuggestedDuration(null)}
        />
      </ModalSurface>
    </DoctorScreen>
  );
}
