"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  House,
  Minus,
  Plus,
  Video,
} from "lucide-react";
import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";
import { Skeleton } from "@startup/web-ui/components/ui/skeleton";
import { Spinner } from "@startup/web-ui/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@startup/web-ui/components/ui/dialog";
import { toast } from "@startup/web-ui/components/ui/toast";
import {
  doctorScheduleSettingsSchema,
  formatDisplayDate,
  type DoctorScheduleSettings,
} from "@startup/contracts";
import { ClockTimePicker } from "../components/ClockTimePicker";
import { ClockDurationPicker } from "../components/ClockDurationPicker";
import { UnavailableDatePicker } from "../components/UnavailableDatePicker";
import { FacilityUnavailableTime } from "../components/FacilityUnavailableTime";
import {
  loadFacilityDoctorSchedule,
  publishFacilityDoctorSchedule,
} from "../server/scheduleActions";
import {
  card,
  initialSettings,
  settingsDraft,
} from "../utils/facilityScheduleEditorConstants";
import {
  previewClocks,
  suggestConsultationDuration,
} from "../utils/scheduleEditor";

type Mode = "clinic" | "online" | "home";

function ScheduleSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-[#0f172a]">{title}</h2>
      <div className={card}>{children}</div>
    </section>
  );
}

function NumberSetting({
  title,
  value,
  min,
  max,
  suffix,
  disabled,
  onChange,
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const displayed = focused ? text : String(value);
  const parsed = /^\d+$/.test(displayed) ? Number(displayed) : NaN;
  const current =
    Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : value;
  const commit = (next: number) => {
    const bounded = Math.max(min, Math.min(max, next));
    setText(String(bounded));
    onChange(bounded);
  };
  return (
    <div className="min-w-0 flex-1 space-y-2">
      <label
        htmlFor={title.replaceAll(" ", "-")}
        className="block text-sm font-medium"
      >
        {title}
      </label>
      <div className="flex min-h-12 overflow-hidden rounded-xl border border-[#d2d2d2] bg-white">
        <button
          type="button"
          aria-label={`Decrease ${title}`}
          disabled={disabled || current <= min}
          onClick={() => commit(current - 1)}
          className="flex w-11 shrink-0 items-center justify-center border-r border-[#d2d2d2] text-[#008577] focus-visible:outline-2 focus-visible:outline-[#008577] disabled:opacity-30"
        >
          <Minus size={18} />
        </button>
        <Input
          id={title.replaceAll(" ", "-")}
          type="text"
          inputMode="numeric"
          aria-label={`${title} in ${suffix}`}
          value={displayed}
          disabled={disabled}
          onFocus={() => {
            setText(String(value));
            setFocused(true);
          }}
          onChange={(event) => {
            const next = event.target.value;
            if (!/^\d{0,3}$/.test(next)) return;
            setText(next);
            const number = Number(next);
            if (next !== "" && number >= min && number <= max) onChange(number);
          }}
          onBlur={() => {
            commit(Number.isFinite(parsed) ? parsed : value);
            setFocused(false);
          }}
          className="h-11 min-w-0 flex-1 rounded-none border-0 text-center text-base shadow-none focus-visible:ring-0"
        />
        <button
          type="button"
          aria-label={`Increase ${title}`}
          disabled={disabled || current >= max}
          onClick={() => commit(current + 1)}
          className="flex w-11 shrink-0 items-center justify-center border-l border-[#d2d2d2] text-[#008577] focus-visible:outline-2 focus-visible:outline-[#008577] disabled:opacity-30"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

function DecimalSetting({
  id,
  label,
  value,
  max,
  nullable = false,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  max: number;
  nullable?: boolean;
  disabled: boolean;
  onChange: (value: number | null) => void;
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const display = focused ? text : value === null ? "" : String(value);
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={display}
      disabled={disabled}
      onFocus={() => {
        setText(value === null ? "" : String(value));
        setFocused(true);
      }}
      onChange={(event) => {
        const next = event.target.value;
        if (!/^\d{0,6}(?:\.\d{0,2})?$/.test(next)) return;
        setText(next);
        if (next !== "" && next !== "." && Number(next) <= max)
          onChange(Number(next));
      }}
      onBlur={() => {
        const parsed = Number(text);
        if (text === "" && nullable) onChange(null);
        else if (text === "" || !Number.isFinite(parsed) || parsed > max)
          onChange(value ?? 0);
        else onChange(parsed);
        setFocused(false);
      }}
    />
  );
}

function ToggleSetting({
  title,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 text-sm text-[#0f172a]">
      <span>{title}</span>
      <input
        type="checkbox"
        role="switch"
        aria-label={title}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-[#d1d5db] transition-colors after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform checked:bg-[#008577] checked:after:translate-x-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008577] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

function HelpDialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value: boolean) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="bg-white text-[#0f172a] sm:max-w-sm">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription asChild>
          <div className="space-y-3 text-sm text-[#475569]">{children}</div>
        </DialogDescription>
        <Button type="button" onClick={onClose}>
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function FacilityDoctorScheduleScreen({
  practiceId,
  mode,
}: {
  practiceId: string;
  mode?: Mode;
}) {
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
        {(
          [
            [
              "clinic",
              "Clinic appointments",
              "Manage visits at your clinic or hospital",
              Building2,
            ],
            [
              "home",
              "Home visits",
              "Manage home-visit times and travel radius",
              House,
            ],
            [
              "online",
              "Online consultations",
              "Manage video consultation times",
              Video,
            ],
          ] as const
        ).map(([service, title, description, Icon]) => (
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

function FacilityDoctorScheduleEditor({
  practiceId,
  mode,
}: {
  practiceId: string;
  mode: Mode;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const schedule = useQuery({
    queryKey: ["facility-practice-schedule", practiceId],
    queryFn: () => loadFacilityDoctorSchedule(practiceId),
  });
  const result = schedule.data as
    Awaited<ReturnType<typeof loadFacilityDoctorSchedule>> | undefined;
  const saved = result?.ok ? result.settings : null;
  const daysKey =
    mode === "online"
      ? "onlineWorkingDays"
      : mode === "home"
        ? "homeWorkingDays"
        : "workingDays";
  const startKey =
    mode === "online"
      ? "onlineStart"
      : mode === "home"
        ? "homeStart"
        : "clinicStart";
  const endKey =
    mode === "online" ? "onlineEnd" : mode === "home" ? "homeEnd" : "clinicEnd";
  const durationKey =
    mode === "online"
      ? "onlineSlotMinutes"
      : mode === "home"
        ? "homeSlotMinutes"
        : "slotMinutes";
  const limitKey = mode === "online" ? "onlineDailyLimit" : "walkinDailyLimit";
  const feeKey =
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
  const suggestion = suggestConsultationDuration(
    draft[startKey] ?? "",
    draft[endKey] ?? "",
    draft[limitKey]
  );
  const suggestedTimes = suggestedDuration
    ? previewClocks(
        draft[startKey] ?? "",
        draft[endKey] ?? "",
        suggestedDuration
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

  return (
    <div className="w-full max-w-full min-w-0 space-y-6 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#0f172a]">
          {mode === "clinic"
            ? "Clinic Schedule"
            : mode === "online"
              ? "Online Schedule"
              : "Home Visit Schedule"}
        </h1>
        {result?.ok ? (
          <p className="text-sm text-[#475569]">{result.doctor.name}</p>
        ) : null}
      </div>
      {schedule.isPending ? (
        <div className={card} aria-label="Loading schedule">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : result?.ok ? (
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <ScheduleSection title="Working Days">
            <p className="text-xs text-[#475569]">Select your working days.</p>
            <div className="flex gap-2 overflow-x-auto py-1">
              {[
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].map((day, index) => {
                const selected = serviceDays.includes(index + 1);
                return (
                  <button
                    key={day}
                    type="button"
                    role="checkbox"
                    aria-label={day}
                    aria-checked={selected}
                    disabled={pending}
                    onClick={() =>
                      update({
                        [daysKey]: selected
                          ? serviceDays.filter((value) => value !== index + 1)
                          : [...serviceDays, index + 1].sort((a, b) => a - b),
                      })
                    }
                    className={`flex h-16 w-[54px] shrink-0 items-center justify-center rounded-[14px] border text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008577] disabled:opacity-50 ${selected ? "border-[#173d3a] bg-[#173d3a] text-white" : "border-[#d2d2d2] bg-white text-[#0f172a]"}`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </ScheduleSection>
          <ScheduleSection
            title={
              mode === "clinic"
                ? "Clinic Hours"
                : mode === "online"
                  ? "Online Hours"
                  : "Home Visit Hours"
            }
          >
            <p className="text-xs text-[#475569]">
              Set your start and end times.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <ClockTimePicker
                label="Start Time"
                value={draft[startKey] ?? ""}
                disabled={pending}
                onChange={(value) => update({ [startKey]: value })}
              />
              <ClockTimePicker
                label="End Time"
                value={draft[endKey] ?? ""}
                disabled={pending}
                endOfDay
                onChange={(value) => update({ [endKey]: value })}
              />
            </div>
          </ScheduleSection>
          <ScheduleSection title="Appointment slots">
            <p className="text-xs text-[#475569]">
              {mode === "home"
                ? "Set your visit duration."
                : "Duration sets appointment times. The daily limit caps bookings."}
            </p>
            <div className="flex flex-col items-start gap-3 sm:flex-row">
              <ClockDurationPicker
                label={
                  mode === "home"
                    ? "Home-visit slot duration"
                    : "Consultation duration"
                }
                value={duration}
                min={mode === "home" ? 30 : 5}
                max={120}
                disabled={pending}
                onChange={(minutes) => {
                  update({ [durationKey]: minutes });
                  setAvailabilityDuration(minutes);
                }}
              />
              {mode !== "home" ? (
                <NumberSetting
                  title="Daily booking limit"
                  value={draft[limitKey]}
                  min={0}
                  max={100}
                  suffix="bookings"
                  disabled={pending}
                  onChange={(value) => update({ [limitKey]: value })}
                />
              ) : null}
            </div>
            {mode !== "home" ? (
              <>
                <p className="text-xs text-[#475569]">
                  Changing the daily limit does not change appointment times.
                </p>
                {!saved?.published_modes?.includes(mode) ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[#475569]">
                      Preview a duration based on your hours and daily limit.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending || suggestion === null}
                      onClick={() => setSuggestedDuration(suggestion)}
                    >
                      Suggest duration
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}
          </ScheduleSection>
          <ScheduleSection title="Auto Accept Bookings">
            <ToggleSetting
              title="Enable automatic acceptance"
              checked={draft.autoAccept}
              disabled={pending}
              onChange={(checked) =>
                update({
                  autoAccept: checked,
                  autoAcceptLimit: checked
                    ? Math.max(1, draft.autoAcceptLimit)
                    : 0,
                })
              }
            />
            <p className="text-xs text-[#475569]">
              Set your daily auto-booking limit.
            </p>
            {draft.autoAccept ? (
              <>
                <NumberSetting
                  title="Shared daily auto-accept limit"
                  value={draft.autoAcceptLimit}
                  min={1}
                  max={100}
                  suffix="bookings"
                  disabled={pending}
                  onChange={(value) => update({ autoAcceptLimit: value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setShowAutoBookingHelp(true)}
                >
                  Set auto-booking limit
                </Button>
              </>
            ) : null}
          </ScheduleSection>
          {mode === "home" ? (
            <ScheduleSection title="Home Visit Appointments">
              <ToggleSetting
                title="Enable home visits"
                checked={draft.homeVisits}
                disabled={pending}
                onChange={(homeVisits) => update({ homeVisits })}
              />
              <p className="text-xs text-[#475569]">
                Set your home-visit travel radius.
              </p>
              {draft.homeVisits ? (
                <div className="space-y-2">
                  <label
                    htmlFor="home-radius"
                    className="block text-sm font-medium"
                  >
                    Travel radius from practice (km)
                  </label>
                  <DecimalSetting
                    id="home-radius"
                    label="Home visit travel radius in kilometres"
                    value={draft.homeRadiusKm}
                    max={9999.99}
                    nullable
                    disabled={pending}
                    onChange={(homeRadiusKm) => update({ homeRadiusKm })}
                  />
                </div>
              ) : null}
            </ScheduleSection>
          ) : null}
          <ScheduleSection title="Consultation Charges">
            <p className="text-xs text-[#475569]">Set your appointment fee.</p>
            <div className="flex items-center justify-between gap-3 text-sm">
              <label htmlFor="consultation-fee">{feeLabel}</label>
              <div className="flex w-36 items-center gap-2">
                <span>₹</span>
                <DecimalSetting
                  id="consultation-fee"
                  label={`${feeLabel} charge in rupees`}
                  value={(fee ?? 0) / 100}
                  max={100000}
                  disabled={pending}
                  onChange={(value) =>
                    update({ [feeKey]: Math.round((value ?? 0) * 100) })
                  }
                />
              </div>
            </div>
          </ScheduleSection>
          <ScheduleSection title="Apply changes from">
            <p className="text-xs text-[#475569]">
              New appointment times apply from this date. Existing appointments
              and pending requests keep their times. Daily booking limits apply
              when saved.
            </p>
            <UnavailableDatePicker
              value={startsFrom}
              onChange={setEffectiveDate}
              timeZone={zone ?? undefined}
              minDate={today}
              disabled={pending}
              label="Start date"
            />
          </ScheduleSection>
          <Button
            type="submit"
            disabled={pending || schedule.isFetching}
            className="min-h-12 w-full sm:w-auto"
          >
            {pending ? <Spinner /> : <CalendarDays size={17} />}
            Publish Schedule
          </Button>
        </form>
      ) : (
        <div className={card}>
          <p role="alert">
            {result && !result.ok ? result.error : "Could not load schedule."}
          </p>
          <Button variant="outline" onClick={() => void schedule.refetch()}>
            Retry
          </Button>
        </div>
      )}
      <HelpDialog
        open={showScheduleHelp}
        title="Set your schedule"
        onClose={() => setShowScheduleHelp(false)}
      >
        <p>
          Choose working days, hours and the slot interval. Publishing creates
          the next 30 days automatically. The daily booking limit counts active
          bookings; patients can choose any available time within working hours.
          Auto-accept uses one shared daily limit across all services.
        </p>
      </HelpDialog>
      <HelpDialog
        open={showAutoBookingHelp}
        title="Automatic bookings"
        onClose={() => setShowAutoBookingHelp(false)}
      >
        <p>
          Up to {draft.autoAcceptLimit} bookings per day are auto-accepted
          across Clinic, Online and Home visits combined.
        </p>
        <div className="flex items-start gap-2">
          <Check size={16} className="mt-0.5 shrink-0 text-[#008577]" />
          <span>Bookings are accepted instantly under the limit.</span>
        </div>
        <div className="flex items-start gap-2">
          <Check size={16} className="mt-0.5 shrink-0 text-[#008577]" />
          <span>Bookings beyond the limit need manual approval.</span>
        </div>
      </HelpDialog>
      <HelpDialog
        open={availabilityDuration !== null}
        title="Automatic availability"
        onClose={() => setAvailabilityDuration(null)}
      >
        <p>
          When you publish, slots are created every {availabilityDuration}{" "}
          minutes on your selected working days. Unavailable time and existing
          appointments are respected.
        </p>
      </HelpDialog>
      <Dialog
        open={suggestedDuration !== null}
        onOpenChange={(open) => {
          if (!open) setSuggestedDuration(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white text-[#0f172a] sm:max-w-sm">
          <DialogTitle>Suggested consultation duration</DialogTitle>
          <DialogDescription>
            Based on your working hours and daily booking limit. Review this
            duration before publishing.
          </DialogDescription>
          <p className="text-lg font-semibold">
            {suggestedDuration} minutes per consultation
          </p>
          <p className="text-sm text-[#475569]">
            {suggestedTimes.length} appointment times within your hours, with up
            to {draft[limitKey]} bookings per day.
          </p>
          <p className="text-sm text-[#475569]">
            {suggestedTimes.slice(0, 4).join(" · ")}
            {suggestedTimes.length > 4 ? " …" : ""}
          </p>
          <p className="text-sm text-[#475569]">
            Later daily-limit changes will not recalculate it.
          </p>
          <Button
            type="button"
            onClick={() => {
              if (suggestedDuration === null) return;
              update({ [durationKey]: suggestedDuration });
              setSuggestedDuration(null);
            }}
          >
            Use this duration
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSuggestedDuration(null)}
          >
            Keep current duration
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
