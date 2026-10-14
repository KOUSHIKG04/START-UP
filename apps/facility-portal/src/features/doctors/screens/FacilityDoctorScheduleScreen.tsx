"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Building2, House, Video, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";
import { Spinner } from "@startup/web-ui/components/ui/spinner";
import { Skeleton } from "@startup/web-ui/components/ui/skeleton";
import { Label } from "@startup/web-ui/components/ui/label";
import { toast } from "@startup/web-ui/components/ui/toast";
import {
  doctorScheduleSettingsSchema,
  formatDisplayDateTime,
  parseDisplayDate,
  type DoctorScheduleSettings,
} from "@startup/contracts";
import {
  loadFacilityDoctorSchedule,
  saveFacilityDoctorSchedule,
  publishFacilityDoctorSlots,
} from "../server/scheduleActions";
import { practiceSlotIso, previewClocks } from "../utils/scheduleEditor";
import { initialSettings, settingsDraft, card } from "../utils/facilityScheduleEditorConstants";
export function FacilityDoctorScheduleScreen({ practiceId, mode }: { practiceId: string; mode?: "clinic" | "online" | "home" }) {
  if (mode) return <FacilityDoctorScheduleEditor key={`${practiceId}:${mode}`} practiceId={practiceId} mode={mode} />;
  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-4"><h1 className="text-2xl font-bold">Manage Schedule</h1><Button asChild variant="outline"><Link href="/doctor-schedules">Back to doctors</Link></Button></div>
    <div className="grid max-w-3xl gap-4">
      {([
        ["clinic", "Clinic appointments", "Manage visits at this facility", Building2],
        ["home", "Home visits", "Manage visit times and travel radius", House],
        ["online", "Online consultations", "Manage video consultation times", Video],
      ] as const).map(([service, title, description, Icon]) => <Link key={service}
        href={`/doctor-schedules/${practiceId}/${service}`}
        className="flex min-h-20 items-center gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 hover:bg-[#f8fafc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008577]">
        <Icon className="size-6 shrink-0 text-[#008577]" /><div className="flex-1"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-[#475569]">{description}</p></div><ChevronRight className="size-5 text-[#64748b]" />
      </Link>)}
    </div>
  </div>;
}
function FacilityDoctorScheduleEditor({ practiceId, mode }: { practiceId: string; mode: "clinic" | "online" | "home" }) {
  const client = useQueryClient();
  const router = useRouter();
  const [date, setDate] = useState("");
  const day = parseDisplayDate(date);
  const schedule = useQuery({
    queryKey: ["facility-practice-schedule", practiceId, day],
    queryFn: () => loadFacilityDoctorSchedule(practiceId, day ?? undefined),
  });
  const result = schedule.data;
  const saved = result?.ok ? result.settings : null;
  const [edits, setEdits] = useState<{ version: number; settings: DoctorScheduleSettings } | null>(null);
  const version = edits?.version ?? Number(saved?.row_version ?? 0);
  const draft = edits?.settings ?? (saved ? settingsDraft(saved) : initialSettings);
  const setDraft = (settings: DoctorScheduleSettings) => setEdits({ version, settings });
  const daysKey = mode === "online" ? "onlineWorkingDays" : mode === "home" ? "homeWorkingDays" : "workingDays";
  const acceptKey = "autoAccept";
  const limitKey = "autoAcceptLimit";
  const serviceDays = draft[daysKey] ?? draft.workingDays;
  const [window, setWindow] = useState({ start: "09:00", end: "12:00" });
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (result && !result.ok)
      toast.add({
        title: "Could not load schedule",
        description: result.error,
        type: "error",
      });
  }, [result]);
  const update = (changes: Partial<DoctorScheduleSettings>) =>
    setEdits({ version, settings: { ...draft, ...changes } });
  const duration = saved
    ? mode === "clinic"
      ? saved.slot_minutes
      : mode === "online"
        ? saved.online_slot_minutes
        : saved.home_slot_minutes
    : 0;
  const fee = saved
    ? mode === "clinic"
      ? saved.clinic_fee_minor
      : mode === "online"
        ? saved.online_fee_minor
        : saved.home_fee_minor
    : null;
  const usage = result?.ok ? result.usage : null;
  const remaining =
    saved && usage
      ? mode === "clinic"
        ? Math.max(0, saved.walkin_daily_limit - usage.clinic)
        : mode === "online"
          ? Math.max(0, saved.online_daily_limit - usage.online)
          : Math.max(0, 100 - usage.home)
      : 0;
  const timezone = result?.ok ? result.doctor.booking_timezone : undefined;
  const clocks = previewClocks(window.start, window.end, duration);
  const slots =
    day &&
    timezone &&
    saved &&
    (mode === "online" ? saved.online_working_days ?? saved.working_days : mode === "home" ? saved.home_working_days ?? saved.working_days : saved.working_days).includes(new Date(`${day}T12:00:00Z`).getUTCDay() || 7)
      ? clocks.flatMap((clock) => {
          try {
            const iso = practiceSlotIso(day, clock, timezone);
            const start = Date.parse(iso);
            const end = start + duration * 60000;
            const unavailable =
              start <= schedule.dataUpdatedAt ||
              (result?.ok &&
                result.sessions.some(
                  (session) =>
                    session.state !== "cancelled" &&
                    session.state !== "closed" &&
                    start < Date.parse(session.ends_at) &&
                    end > Date.parse(session.starts_at)
                ));
            return [{ clock, iso, unavailable }];
          } catch {
            return [];
          }
        })
      : [];
  const publishReady = Boolean(
    day &&
    timezone &&
    saved &&
    usage &&
    selected.length &&
    selected.length <= remaining &&
    selected.every((iso) => slots.some((slot) => slot.iso === iso && !slot.unavailable)) &&
    fee !== null &&
    (mode !== "home" || saved.home_visits)
  );
  const fail = (message: string) =>
    toast.add({
      title: "Schedule action failed",
      description: message,
      type: "error",
    });
  async function reload() {
    const refreshed = await schedule.refetch();
    if (refreshed.data?.ok) {
      const next = refreshed.data.settings;
      setDraft(next ? settingsDraft(next) : initialSettings);
      setEdits(null);
      setSelected([]);
    }
  }
  function numberField(
    key: keyof DoctorScheduleSettings,
    label: string,
    nullable = false,
    money = false
  ) {
    const value = draft[key];
    return (
      <div className="space-y-2">
        <Label htmlFor={String(key)}>{label}</Label>
        <Input
          id={String(key)}
          type="number"
          min="0"
          step={money ? "0.01" : "1"}
          value={typeof value === "number" ? (money ? value / 100 : value) : ""}
          disabled={pending}
          onChange={(event) =>
            update({
              [key]:
                event.target.value === "" && nullable
                  ? null
                  : money
                    ? Math.round(Number(event.target.value) * 100)
                    : Number(event.target.value),
            })
          }
        />
      </div>
    );
  }
  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">{mode === "clinic" ? "Clinic Schedule" : mode === "online" ? "Online Schedule" : "Home Visit Schedule"}</h1>
          <p className="text-sm text-[#475569]">
            {result?.ok ? result.doctor.name : "Doctor schedule"}
            {timezone ? ` - ${timezone}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={pending || schedule.isFetching}
            onClick={() =>
              startTransition(async () => {
                await reload();
              })
            }
          >
            {schedule.isFetching ? <Spinner /> : "Refresh"}
          </Button>
          <Link href={`/doctor-schedules/${practiceId}`} className="text-sm underline">
            Back to services
          </Link>
        </div>
      </div>
      {schedule.isPending ? (
        <div className={card} aria-label="Loading schedule">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-9 w-32" />
        </div>
      ) : result?.ok ? (
        <>
          <form
            className={card}
            onSubmit={(event) => {
              event.preventDefault();
              const parsed = doctorScheduleSettingsSchema.safeParse(draft);
              if (!parsed.success) {
                fail(
                  parsed.error.issues[0]?.message ??
                    "Check the schedule fields."
                );
                return;
              }
              startTransition(async () => {
                const response = await saveFacilityDoctorSchedule(
                  practiceId,
                  parsed.data,
                  version
                );
                if (!response.ok) {
                  fail(response.error);
                  return;
                }
                setDraft(settingsDraft(response.settings));
                setEdits(null);
                setSelected([]);
                await client.invalidateQueries({
                  queryKey: ["facility-practice-schedule", practiceId],
                });
                router.refresh();
                toast.add({ title: "Schedule saved", type: "success" });
              });
            }}
          >
            <h2 className="text-lg font-semibold">
              Working days and consultation settings
            </h2>
            <p className="text-sm text-[#475569]">Working days, duration, fees and slots are separate. Auto-confirm uses one shared daily limit across Clinic, Online and Home visits combined.</p>
            <fieldset disabled={pending} className="flex flex-wrap gap-3">
              <legend className="mb-2 text-sm font-medium">Working days</legend>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                (label, index) => (
                  <label
                    key={label}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={serviceDays.includes(index + 1)}
                      onChange={(event) =>
                        update({
                          [daysKey]: event.target.checked
                            ? [...serviceDays, index + 1].sort()
                            : serviceDays.filter(
                                (day) => day !== index + 1
                              ),
                        })
                      }
                    />
                    {label}
                  </label>
                )
              )}
            </fieldset>
            {mode === "clinic" ? <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clinic-start">Start time (24-hour)</Label>
                <Input
                  id="clinic-start"
                  value={draft.clinicStart}
                  placeholder="09:00"
                  onChange={(event) =>
                    update({ clinicStart: event.target.value })
                  }
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic-end">End time (24-hour)</Label>
                <Input
                  id="clinic-end"
                  value={draft.clinicEnd}
                  placeholder="17:00 or 24:00"
                  onChange={(event) =>
                    update({ clinicEnd: event.target.value })
                  }
                  disabled={pending}
                />
              </div>
            </div> : null}
            <div className="grid gap-4 sm:grid-cols-3">
              {mode === "clinic" ? numberField("slotMinutes", "Clinic slot duration (minutes)") : null}
              {mode === "online" ? numberField(
                "onlineSlotMinutes",
                "Online slot duration (minutes)"
              ) : null}
              {mode === "home" ? numberField("homeSlotMinutes", "Home visit duration (minutes)") : null}
              {mode === "clinic" ? numberField("walkinDailyLimit", "Daily clinic slots limit") : null}
              {mode === "online" ? numberField("onlineDailyLimit", "Daily online slots limit") : null}
              {numberField(limitKey, "Shared daily auto-confirm limit")}
              {mode === "clinic" ? numberField("clinicFeeMinor", "Clinic fee (₹)", false, true) : null}
              {mode === "online" ? numberField("onlineFeeMinor", "Online fee (₹)", true, true) : null}
              {mode === "home" ? numberField("homeFeeMinor", "Home visit fee (₹)", true, true) : null}
              {mode === "home" ? numberField("homeRadiusKm", "Home visit radius (km)", true) : null}
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft[acceptKey] ?? false}
                  disabled={pending}
                  onChange={(event) =>
                    update({ [acceptKey]: event.target.checked })
                  }
                />
                Auto-confirm bookings across all service types
              </label>
{mode === "home" ?               <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.homeVisits}
                  disabled={pending}
                  onChange={(event) =>
                    update({ homeVisits: event.target.checked })
                  }
                />
                Enable home visits for this practice
              </label> : null}
            </div>
            <Button type="submit" aria-label="Save schedule" disabled={pending || schedule.isFetching}>
              {pending ? <Spinner /> : "Save schedule"}
            </Button>
          </form>
          <section className={card}>
            <h2 className="text-lg font-semibold">Publish appointment slots</h2>
            <p className="text-sm text-[#475569]">
              Save working hours first. Select exact future times for each
              service; published bookings keep their existing duration.
            </p>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="publish-date">Date (DD-MM-YYYY)</Label>
                <Input
                  id="publish-date"
                  value={date}
                  placeholder="DD-MM-YYYY"
                  onBlur={() => { if (date && !day) fail("Enter a valid date in DD-MM-YYYY format."); }}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setSelected([]);
                  }}
                  disabled={pending}
                />
              </div>
              {["start", "end"].map((part) => (
                <div key={part} className="space-y-2">
                  <Label htmlFor={`window-${part}`}>
                    {part === "start" ? "From" : "Until"} (24-hour)
                  </Label>
                  <Input
                    id={`window-${part}`}
                    value={window[part as keyof typeof window]}
                    disabled={pending}
                    onChange={(event) => {
                      setWindow((previous) => ({
                        ...previous,
                        [part]: event.target.value,
                      }));
                      setSelected([]);
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-[#475569]">
              {selected.length} selected / {remaining} remaining for this
              service
            </p>
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <Button
                  key={slot.iso}
                  variant={selected.includes(slot.iso) ? "default" : "outline"}
                  size="sm"
                  disabled={
                    pending ||
                    schedule.isFetching ||
                    slot.unavailable ||
                    (!selected.includes(slot.iso) &&
                      selected.length >= remaining) ||
                    (mode === "home" && !saved?.home_visits)
                  }
                  aria-pressed={selected.includes(slot.iso)}
                  onClick={() =>
                    setSelected((previous) =>
                      previous.includes(slot.iso)
                        ? previous.filter((value) => value !== slot.iso)
                        : [...previous, slot.iso]
                    )
                  }
                >
                  {slot.clock}
                </Button>
              ))}
            </div>
            <Button
              aria-label="Publish selected slots"
              disabled={pending || schedule.isFetching || !publishReady}
              onClick={() =>
                startTransition(async () => {
                  if (!publishReady || (!fee && fee !== 0)) return;
                  const response = await publishFacilityDoctorSlots({
                    practiceId,
                    mode,
                    slotStarts: selected,
                    slotMinutes: duration,
                    feeMinor: fee!,
                    currency: "INR",
                  });
                  if (!response.ok) {
                    fail(response.error);
                    return;
                  }
                  setSelected([]);
                  await client.invalidateQueries({
                    queryKey: ["facility-practice-schedule", practiceId],
                  });
                  router.refresh();
                  toast.add({ title: `${response.count} slots published`, type: "success" });
                })
              }
            >
              {pending ? <Spinner /> : "Publish selected slots"}
            </Button>
          </section>
          <section className={card}>
            <h2 className="text-lg font-semibold">Published sessions</h2>
            {result.sessions.filter(session => session.service_mode === mode).length ? (
              result.sessions.filter(session => session.service_mode === mode).map((session) => (
                <div
                  key={session.id}
                  className="flex flex-wrap justify-between gap-2 border-b border-[#e2e8f0] py-3 text-sm"
                >
                  <span>
                    {session.service_mode} -{" "}
                    {formatDisplayDateTime(session.starts_at, session.timezone)}
                  </span>
                  <span>{session.state}</span>

                </div>
              ))
            ) : (
              <p className="text-sm text-[#475569]">
                No published sessions for this service.
              </p>
            )}
          </section>
        </>
      ) : (
        <Button
          variant="outline"
          onClick={() =>
            startTransition(async () => {
              await reload();
            })
          }
          disabled={pending}
        >
          Retry
        </Button>
      )}
    </div>
  );
}
