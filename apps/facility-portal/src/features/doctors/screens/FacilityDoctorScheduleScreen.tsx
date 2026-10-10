"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
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
export function FacilityDoctorScheduleScreen({
  practiceId,
}: {
  practiceId: string;
}) {
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
  const [draft, setDraft] = useState<DoctorScheduleSettings>(initialSettings);
  const [version, setVersion] = useState(0);
  const initialized = useRef(false);
  useEffect(() => {
    if (result?.ok && !initialized.current) {
      initialized.current = true;
      setDraft(result.settings ? settingsDraft(result.settings) : initialSettings);
      setVersion(result.settings ? Number(result.settings.row_version) : 0);
    }
  }, [result]);
  const [mode, setMode] = useState<"clinic" | "online" | "home">("clinic");
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
    setDraft((previous) => ({ ...previous, ...changes }));
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
    saved.working_days.includes(new Date(`${day}T12:00:00Z`).getUTCDay() || 7)
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
      setVersion(next ? Number(next.row_version) : 0);
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
          <h1 className="text-2xl font-bold text-[#0f172a]">Manage Schedule</h1>
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
          <Link href="/doctor-schedules" className="text-sm underline">
            Back to schedules
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
                setVersion(Number(response.settings.row_version));
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
              Working hours and consultation settings
            </h2>
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
                      checked={draft.workingDays.includes(index + 1)}
                      onChange={(event) =>
                        update({
                          workingDays: event.target.checked
                            ? [...draft.workingDays, index + 1].sort()
                            : draft.workingDays.filter(
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
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {numberField("slotMinutes", "Clinic slot duration (minutes)")}
              {numberField(
                "onlineSlotMinutes",
                "Online slot duration (minutes)"
              )}
              {numberField("homeSlotMinutes", "Home visit duration (minutes)")}
              {numberField("walkinDailyLimit", "Daily clinic slots limit")}
              {numberField("onlineDailyLimit", "Daily online slots limit")}
              {numberField("autoAcceptLimit", "Auto-confirm limit")}
              {numberField("clinicFeeMinor", "Clinic fee (₹)", false, true)}
              {numberField("onlineFeeMinor", "Online fee (₹)", true, true)}
              {numberField("homeFeeMinor", "Home visit fee (₹)", true, true)}
              {numberField("homeRadiusKm", "Home visit radius (km)", true)}
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.autoAccept}
                  disabled={pending}
                  onChange={(event) =>
                    update({ autoAccept: event.target.checked })
                  }
                />
                Auto-confirm bookings
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.homeVisits}
                  disabled={pending}
                  onChange={(event) =>
                    update({ homeVisits: event.target.checked })
                  }
                />
                Enable home visits for this practice
              </label>
            </div>
            <Button type="submit" aria-label="Save schedule" disabled={pending}>
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
              <div className="space-y-2">
                <Label htmlFor="service">Consultation type</Label>
                <select
                  id="service"
                  className="h-9 w-full rounded-lg border px-3 text-sm"
                  value={mode}
                  disabled={pending}
                  onChange={(event) => {
                    setMode(event.target.value as typeof mode);
                    setSelected([]);
                  }}
                >
                  <option value="clinic">Clinic visit</option>
                  <option value="online">Online consultation</option>
                  <option value="home">Home visit</option>
                </select>
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
                  toast.add({
                    title: `${response.count} slots published`,
                    type: "success",
                  });
                })
              }
            >
              {pending ? <Spinner /> : "Publish selected slots"}
            </Button>
          </section>
          <section className={card}>
            <h2 className="text-lg font-semibold">Published sessions</h2>
            {result.sessions.length ? (
              result.sessions.map((session) => (
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
                No published sessions for this practice.
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
