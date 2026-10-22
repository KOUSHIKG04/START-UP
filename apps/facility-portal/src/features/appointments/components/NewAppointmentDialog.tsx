"use client";
import { useNewAppointment } from "../hooks/useNewAppointment";
import {
  patientGenderOptions,
  appointmentModeLabels,
} from "../utils/appointmentsConstants";

import { slotLabel } from "../utils/walkInSlotLabel";
import type { NewAppointmentDialogProps } from "../types/newAppointmentDialog";

import { Plus } from "lucide-react";
import { Button } from "@startup/web-ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@startup/web-ui/components/ui/dialog";
import { Input } from "@startup/web-ui/components/ui/input";
import { Label } from "@startup/web-ui/components/ui/label";

export function NewAppointmentDialog({ onCreated }: NewAppointmentDialogProps) {
  const {
    open,
    setOpen,
    loading,
    loadingSlots,
    pending,
    practices,
    slots,
    practiceId,
    windowId,
    setWindowId,
    patientName,
    setPatientName,
    patientPhone,
    setPatientPhone,
    clinicDay,
    patientAge,
    setPatientAge,
    patientGender,
    setPatientGender,
    checkIn,
    setCheckIn,
    reason,
    setReason,
    showDialog,
    choosePractice,
    submit,
  } = useNewAppointment({ onCreated });
  return (
    <>
      <Button
        type="button"
        onClick={() => void showDialog()}
        className="flex items-center gap-1.5 rounded-lg bg-[#07595d] px-4 py-2 text-[13px] font-bold text-white shadow-xs hover:bg-[#064e52]"
      >
        <Plus className="size-4 stroke-[2.5]" /> New Appointment
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next: boolean) => {
          if (!pending) setOpen(next);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white text-[#0f172a] sm:max-w-2xl">
          <DialogTitle>New in-person appointment</DialogTitle>
          <DialogDescription>
            Register a walk-in patient without an app account and reserve a
            published clinic time.
          </DialogDescription>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="walk-in-doctor">Doctor</Label>
              <select
                id="walk-in-doctor"
                value={practiceId}
                onChange={(event) => void choosePractice(event.target.value)}
                disabled={loading || pending}
                required
                className="h-10 w-full rounded-md border border-[#cbd5e1] bg-white px-3 text-sm"
              >
                <option value="">
                  {loading ? "Loading doctors…" : "Choose a doctor"}
                </option>
                {practices.map((practice) => (
                  <option key={practice.practiceId} value={practice.practiceId}>
                    {practice.doctorName} · {practice.facilityName}
                  </option>
                ))}
              </select>
              {!loading && practices.length === 0 && (
                <p className="text-sm text-[#64748b]">
                  No verified doctors are available for this facility.
                </p>
              )}
            </div>
            {clinicDay ? (
              <section
                aria-label="Clinic schedule and capacity"
                className="bg-muted/30 space-y-4 rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      Clinic schedule & capacity
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Clinic hours{" "}
                      {(
                        clinicDay.clinic_time_blocks ?? [
                          {
                            start: clinicDay.clinic_start,
                            end: clinicDay.clinic_end,
                          },
                        ]
                      )
                        .map(
                          (block) =>
                            `${block.start.slice(0, 5)}–${block.end.slice(0, 5)}`
                        )
                        .join(", ")}{" "}
                      · {clinicDay.timezone}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="walk-in-day">Clinic date</Label>
                    <Input
                      id="walk-in-day"
                      type="date"
                      value={clinicDay.local_day}
                      disabled={pending || loadingSlots}
                      onChange={(event) => {
                        if (event.target.value)
                          void choosePractice(practiceId, event.target.value);
                      }}
                    />
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Total used</dt>
                    <dd className="font-semibold">
                      {clinicDay.total_used} / {clinicDay.total_limit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">App bookings</dt>
                    <dd className="font-semibold">
                      {clinicDay.app_used} / {clinicDay.app_limit}
                    </dd>
                    <dd>{clinicDay.app_remaining} remaining</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Walk-ins</dt>
                    <dd className="font-semibold">
                      {clinicDay.walkin_used} / {clinicDay.walkin_limit}
                    </dd>
                    <dd>{clinicDay.walkin_remaining} remaining</dd>
                  </div>
                </dl>
                {clinicDay.doctor_timeline?.length ? (
                  <details>
                    <summary className="cursor-pointer text-sm font-medium">
                      Doctor’s full day
                    </summary>
                    <ul className="mt-3 space-y-2 text-sm">
                      {clinicDay.doctor_timeline.map((block) => {
                        const formatter = new Intl.DateTimeFormat("en-IN", {
                          timeZone: clinicDay.timezone,
                          hour: "numeric",
                          minute: "2-digit",
                        });
                        const from = new Date(block.starts_at),
                          until = new Date(block.ends_at);
                        return (
                          <li
                            key={block.session_id}
                            className="space-y-1 border-b py-2"
                          >
                            <p className="font-medium">
                              {appointmentModeLabels[block.service_mode]}
                              {block.practice_id !== practiceId
                                ? " · Other practice"
                                : ""}
                            </p>
                            <p>
                              {formatter.format(from)}–{formatter.format(until)}
                            </p>
                            {block.travel_buffer_minutes > 0 ? (
                              <p className="text-muted-foreground">
                                Travel reserved{" "}
                                {formatter.format(
                                  new Date(
                                    from.getTime() -
                                      block.travel_buffer_minutes * 60000
                                  )
                                )}
                                –{formatter.format(from)} and{" "}
                                {formatter.format(until)}–
                                {formatter.format(
                                  new Date(
                                    until.getTime() +
                                      block.travel_buffer_minutes * 60000
                                  )
                                )}
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-muted-foreground mt-2 text-xs">
                      Clinic patients can be registered only in clinic times.
                      The doctor is unavailable for clinic consultations during
                      online, home-visit and travel blocks.
                    </p>
                  </details>
                ) : null}
                {clinicDay.walkin_remaining === 0 ? (
                  <p role="status" className="text-sm">
                    No walk-in capacity remains. Update the editable quotas in
                    Doctor Schedules or choose another date.
                  </p>
                ) : null}
                <details>
                  <summary className="cursor-pointer text-sm font-medium">
                    All clinic times ({slots.length})
                  </summary>
                  <ul className="mt-3 grid max-h-48 grid-cols-1 gap-2 overflow-y-auto text-sm sm:grid-cols-2">
                    {slots.map((slot) => (
                      <li
                        key={slot.windowId}
                        className="flex items-center justify-between gap-2 border-b py-2"
                      >
                        <span>{slotLabel(slot)}</span>
                        <span className="capitalize">{slot.state}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="walk-in-slot">Clinic time</Label>
              <select
                id="walk-in-slot"
                value={windowId}
                onChange={(event) => setWindowId(event.target.value)}
                disabled={!practiceId || loadingSlots || pending}
                required
                className="h-10 w-full rounded-md border border-[#cbd5e1] bg-white px-3 text-sm"
              >
                <option value="">
                  {loadingSlots ? "Loading times…" : "Choose a time"}
                </option>
                {slots.map((slot) => (
                  <option
                    key={slot.windowId}
                    value={slot.windowId}
                    disabled={
                      slot.state !== "open" || !clinicDay?.walkin_remaining
                    }
                  >
                    {slotLabel(slot)}
                    {slot.state !== "open" ? ` · ${slot.state}` : ""}
                  </option>
                ))}
              </select>
              {practiceId && !loadingSlots && slots.length === 0 && (
                <p className="text-sm text-[#64748b]">
                  No open in-person slots. Publish clinic availability in Doctor
                  Schedules.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="walk-in-name">Patient name</Label>
              <Input
                id="walk-in-name"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                minLength={2}
                maxLength={160}
                required
                autoComplete="name"
                disabled={pending}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="walk-in-age">Age (optional)</Label>
                <Input
                  id="walk-in-age"
                  type="number"
                  min={0}
                  max={120}
                  step={1}
                  value={patientAge}
                  disabled={pending}
                  onChange={(event) => setPatientAge(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="walk-in-gender">Gender (optional)</Label>
                <select
                  id="walk-in-gender"
                  value={patientGender}
                  disabled={pending}
                  onChange={(event) => setPatientGender(event.target.value)}
                  className="border-input h-10 rounded-md border bg-white px-3"
                >
                  <option value="">Not recorded</option>
                  {patientGenderOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="walk-in-phone">Phone (optional)</Label>
              <Input
                id="walk-in-phone"
                type="tel"
                value={patientPhone}
                onChange={(event) => setPatientPhone(event.target.value)}
                pattern="[+0-9() .-]*"
                maxLength={30}
                autoComplete="tel"
                disabled={pending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="walk-in-reason">
                Reason for visit (optional)
              </Label>
              <textarea
                id="walk-in-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={1000}
                rows={3}
                disabled={pending}
                className="w-full rounded-md border border-[#cbd5e1] bg-white p-3 text-sm"
              />
            </div>
            {clinicDay &&
            clinicDay.local_day ===
              new Intl.DateTimeFormat("en-CA", {
                timeZone: clinicDay.timezone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date()) ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checkIn}
                  disabled={pending}
                  onChange={(event) => setCheckIn(event.target.checked)}
                />
                Patient is here: check in to the queue now
              </label>
            ) : null}
            <Button
              type="submit"
              disabled={
                pending ||
                loadingSlots ||
                !windowId ||
                !clinicDay?.walkin_remaining ||
                patientName.trim().length < 2
              }
              className="bg-[#07595d] text-white hover:bg-[#064e52]"
            >
              {pending ? "Creating…" : "Create appointment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
