"use client";
import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";
import { Label } from "@startup/web-ui/components/ui/label";
import { toast } from "@startup/web-ui/components/ui/toast";
import { formatDisplayDateTime } from "@startup/contracts";
import {
  addFacilityDoctorUnavailability,
  loadFacilityDoctorSchedule,
  removeFacilityDoctorUnavailability,
} from "../server/scheduleActions";
import { UnavailableDatePicker } from "./UnavailableDatePicker";
import { ClockTimePicker } from "./ClockTimePicker";
import { practiceSlotIso } from "../utils/scheduleEditor";
import {
  card,
  unavailableServiceOptions as scopes,
} from "../utils/facilityScheduleEditorConstants";

export function FacilityUnavailableTime({
  practiceId,
}: {
  practiceId: string;
}) {
  const client = useQueryClient();
  const schedule = useQuery({
    queryKey: ["facility-practice-schedule", practiceId],
    queryFn: () => loadFacilityDoctorSchedule(practiceId),
  });
  type Scope = (typeof scopes)[number][0];
  const [selectedScopes, setScopes] = useState<Scope[]>(["all"]);
  function toggleScope(value: Scope) {
    setScopes(current => {
      if (value === "all") return ["all"];
      const services = current.filter(item => item !== "all");
      const next = services.includes(value) ? services.filter(item => item !== value) : [...services,value];
      return next.length === 0 || next.length === 3 ? ["all"] : next;
    });
  }
  const scopeLabel = selectedScopes.includes("all") ? "all services" : scopes.filter(([value]) => selectedScopes.includes(value)).map(([,label]) => label).join(" and ");
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
  return (
    <>
      <div
        role="group"
        aria-label="Unavailable time service"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {scopes.map(([value, label]) => (
          <label
            key={value}
            className={`flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border px-5 text-sm font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#008577] ${selectedScopes.includes(value) ? "border-[#008577] bg-[#008577] text-white" : "border-[#e2e8f0] bg-white text-[#0f172a]"}`}
          >
            <input
              type="checkbox"
              name={`unavailable-service-${practiceId}`}
              value={value}
              checked={selectedScopes.includes(value)}
              disabled={pending}
              onChange={() => toggleScope(value)}
              className="mr-2 h-4 w-4 shrink-0 appearance-none rounded-full border border-current checked:border-4 disabled:cursor-not-allowed"
            />
            {label}
          </label>
        ))}
      </div>
      <p className="text-sm text-[#475569]">This block applies to {scopeLabel.toLowerCase()}.</p>
      <section className={card}>
        <h2 className="text-[20px] font-normal">Unavailable time</h2>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!zone) return;
            const day = date;
            if (!day) {
              fail("Choose a date.");
              return;
            }
            try {
              const startsAt = practiceSlotIso(day, start, zone);
              const nextDay = new Date(
                Date.parse(day + "T00:00:00Z") + 86400000
              )
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
                cause instanceof Error
                  ? cause.message
                  : "Check the date and hours."
              );
            }
          }}
        >
          <UnavailableDatePicker value={date} onChange={setDate} timeZone={zone ?? undefined} disabled={pending} />
          <div className="grid gap-4 sm:grid-cols-2">
            <ClockTimePicker label="Start time" value={start} onChange={setStart} disabled={pending} />
            <ClockTimePicker label="End time" value={end} onChange={setEnd} disabled={pending} endOfDay />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leave-reason">Reason</Label>
            <Input
              id="leave-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={pending}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={
              pending ||
              !zone ||
              schedule.isFetching ||
              reason.trim().length < 2
            }
          >
            Add unavailable time
          </Button>
        </form>
        {result?.ok
          ? result.unavailable
              .filter(
                (item) =>
                  item.state === "active" &&
                  (selectedScopes.includes("all") ||
                    item.service_mode === "all" ||
                    selectedScopes.includes(item.service_mode))
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] pt-4"
                >
                  <div>
                    <p className="text-sm">
                      {formatDisplayDateTime(item.starts_at, zone ?? undefined)}{" "}
                      – {formatDisplayDateTime(item.ends_at, zone ?? undefined)}
                    </p>
                    <p className="mt-1 text-sm text-[#475569]">
                      {item.service_mode === "all"
                        ? "All services"
                        : item.service_mode}{" "}
                      · {item.reason}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const response =
                          await removeFacilityDoctorUnavailability(
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
                      })
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))
          : null}
        {schedule.isError || (result && !result.ok) ? (
          <p role="alert" className="text-sm text-red-700">
            Could not load unavailable time.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void schedule.refetch()}
            >
              Retry
            </button>
          </p>
        ) : null}
      </section>
    </>
  );
}
