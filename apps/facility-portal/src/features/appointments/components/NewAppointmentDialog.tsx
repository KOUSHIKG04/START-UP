"use client";
import { useNewAppointment } from "../hooks/useNewAppointment";

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
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white text-[#0f172a] sm:max-w-lg">
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
                  <option key={slot.windowId} value={slot.windowId}>
                    {slotLabel(slot)}
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
            <Button
              type="submit"
              disabled={
                pending ||
                loadingSlots ||
                !windowId ||
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
