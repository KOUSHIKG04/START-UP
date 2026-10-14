"use client";
import { UnavailableDatePicker } from "../components/UnavailableDatePicker";
import { ClockTimePicker } from "../components/ClockTimePicker";
import { useState, useTransition } from "react";
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
  type DoctorScheduleSettings,
} from "@startup/contracts";
import {
  loadFacilityDoctorSchedule,
  publishFacilityDoctorSchedule,
} from "../server/scheduleActions";
import { previewClocks } from "../utils/scheduleEditor";
import {
  initialSettings,
  settingsDraft,
  card,
} from "../utils/facilityScheduleEditorConstants";
import { FacilityUnavailableTime } from "../components/FacilityUnavailableTime";

export function FacilityDoctorScheduleScreen({
  practiceId,
  mode,
}: {
  practiceId: string;
  mode?: "clinic" | "online" | "home";
}) {
  if (mode)
    return (
      <FacilityDoctorScheduleEditor
        key={practiceId + ":" + mode}
        practiceId={practiceId}
        mode={mode}
      />
    );
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Manage Schedule</h1>
        <Button asChild variant="outline">
          <Link href="/doctor-schedules">Back to doctors</Link>
        </Button>
      </div>
      <div className="grid max-w-3xl gap-4">
        {(
          [
            [
              "clinic",
              "Clinic appointments",
              "Manage visits at this facility",
              Building2,
            ],
            [
              "home",
              "Home visits",
              "Manage visit times and travel radius",
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
            href={"/doctor-schedules/" + practiceId + "/" + service}
            className="flex min-h-20 items-center gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 hover:bg-[#f8fafc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008577]"
          >
            <Icon className="size-6 shrink-0 text-[#008577]" />
            <div className="flex-1">
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
  mode: "clinic" | "online" | "home";
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
  const [availableDay,setAvailableDay] = useState("");
  const [edits, setEdits] = useState<{
    version: number;
    settings: DoctorScheduleSettings;
  } | null>(null);
  const version = edits?.version ?? Number(saved?.row_version ?? 0);
  const draft =
    edits?.settings ?? (saved ? settingsDraft(saved) : initialSettings);
  const [pending, startTransition] = useTransition();
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
  const serviceDays = draft[daysKey] ?? draft.workingDays;
  const duration =
    mode === "clinic"
      ? draft.slotMinutes
      : mode === "online"
        ? draft.onlineSlotMinutes
        : draft.homeSlotMinutes;
  const timezone = result?.ok ? result.doctor.booking_timezone : undefined;
  const selectedDay = availableDay || new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const visibleSessions = result?.ok ? result.sessions.filter(s => s.service_mode===mode && s.state!=="cancelled" && new Intl.DateTimeFormat("en-CA",{timeZone:s.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(s.starts_at))===selectedDay) : [];
  const update = (changes: Partial<DoctorScheduleSettings>) =>
    setEdits({ version, settings: { ...draft, ...changes } });
  const fail = (message: string) =>
    toast.add({
      title: "Schedule action failed",
      description: message,
      type: "error",
    });
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
          <h1 className="text-2xl font-bold text-[#0f172a]">
            {mode === "clinic"
              ? "Clinic Schedule"
              : mode === "online"
                ? "Online Schedule"
                : "Home Visit Schedule"}
          </h1>
          <p className="text-sm text-[#475569]">
            {result?.ok ? result.doctor.name : "Doctor schedule"}
            {timezone ? " · " + timezone : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            disabled={pending || schedule.isFetching}
            onClick={() =>
              startTransition(async () => {
                await schedule.refetch();
                setEdits(null);
              })
            }
          >
            {schedule.isFetching ? <Spinner /> : "Refresh"}
          </Button>
          <Link
            href={"/doctor-schedules/" + practiceId}
            className="self-center text-sm underline"
          >
            Back to services
          </Link>
        </div>
      </div>
      {schedule.isPending ? (
        <div className={card} aria-label="Loading schedule">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-32 w-full" />
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
                const response = await publishFacilityDoctorSchedule(
                  practiceId,
                  mode,
                  parsed.data,
                  version
                );
                if (!response.ok) {
                  fail(response.error);
                  return;
                }
                client.setQueryData(
                  ["facility-practice-schedule", practiceId],
                  { ...result, settings: response.settings }
                );
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
                    ? "Schedule published. New slots start from tomorrow."
                    : "Future unbooked slots are withdrawn. Existing appointments keep their times.",
                  type: "success",
                });
              });
            }}
          >
            <h2 className="text-lg font-semibold">
              Working days and consultation settings
            </h2>
            <p className="text-sm text-[#475569]">
              Publishing creates slots from these days, hours and interval.
              Auto-confirm uses one shared daily limit across Clinic, Online and
              Home.
            </p>
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
                            : serviceDays.filter((day) => day !== index + 1),
                        })
                      }
                    />
                    {label}
                  </label>
                )
              )}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <ClockTimePicker label="Start time" value={draft[startKey] ?? ""} disabled={pending}
                onChange={value => update({[startKey]:value})} />
              <ClockTimePicker label="End time" value={draft[endKey] ?? ""} disabled={pending} endOfDay
                onChange={value => update({[endKey]:value})} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {mode === "clinic"
                ? numberField("slotMinutes", "Clinic slot interval (minutes)")
                : mode === "online"
                  ? numberField(
                      "onlineSlotMinutes",
                      "Online slot interval (minutes)"
                    )
                  : numberField(
                      "homeSlotMinutes",
                      "Home visit interval (minutes)"
                    )}
              {mode === "clinic"
                ? numberField("walkinDailyLimit", "Daily clinic slots limit")
                : mode === "online"
                  ? numberField("onlineDailyLimit", "Daily online slots limit")
                  : null}
              {numberField(
                "autoAcceptLimit",
                "Shared daily auto-confirm limit"
              )}
              {mode === "clinic"
                ? numberField("clinicFeeMinor", "Clinic fee (₹)", false, true)
                : mode === "online"
                  ? numberField("onlineFeeMinor", "Online fee (₹)", true, true)
                  : numberField(
                      "homeFeeMinor",
                      "Home visit fee (₹)",
                      true,
                      true
                    )}
              {mode === "home"
                ? numberField("homeRadiusKm", "Home visit radius (km)", true)
                : null}
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
                Auto-confirm bookings across all services
              </label>
              {mode === "home" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.homeVisits}
                    disabled={pending}
                    onChange={(event) =>
                      update({ homeVisits: event.target.checked })
                    }
                  />
                  Enable home visits
                </label>
              ) : null}
            </div>
            <p className="text-sm text-[#475569]">
              {
                previewClocks(
                  draft[startKey] ?? "",
                  draft[endKey] ?? "",
                  duration
                ).length
              }{" "}
              possible slots per working day, up to the daily limit. Unavailable
              time and existing appointments are respected.
            </p>
            <Button type="submit" disabled={pending || schedule.isFetching}>
              {pending ? <Spinner /> : "Publish schedule"}
            </Button>
          </form>
          <section className={card}>
            <h2 className="text-lg font-semibold">Automatic availability</h2>
            <p className="text-sm text-[#475569]">
              {saved?.published_modes?.includes(mode)
                ? "This recurring schedule is published and extends daily for the next 30 days."
                : "Publish the schedule above to make availability visible to patients."}
            </p>
          </section>
          <section className={card}>
            <h2 className="text-lg font-semibold">Available times</h2>
            <p className="text-sm text-[#475569]">Booking preview for this service, excluding unavailable time and full slots.</p>
            <UnavailableDatePicker key={timezone} value={selectedDay} onChange={setAvailableDay} timeZone={timezone} disabled={false} />
            {visibleSessions.length ? (
              visibleSessions
                .map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-wrap justify-between gap-2 border-b border-[#e2e8f0] py-3 text-sm"
                  >
                    <span>
                      {formatDisplayDateTime(
                        session.starts_at,
                        session.timezone
                      )}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {session.available_slots?.map(slot => <span key={slot.starts_at}>
                        {new Date(slot.starts_at).toLocaleTimeString([], {timeZone:session.timezone,hour:"numeric",minute:"2-digit"})} to {new Date(slot.ends_at).toLocaleTimeString([], {timeZone:session.timezone,hour:"numeric",minute:"2-digit"})}
                      </span>)}
                      {session.available_slots?.length===0 && new Date(session.ends_at)>new Date() ? <span>Not available. Choose another time or date.</span> : null}
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-[#475569]">
                Not available on this date. Choose another date.
              </p>
            )}
          </section>
        </>
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
    </div>
  );
}
