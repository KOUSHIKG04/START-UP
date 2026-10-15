"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "@startup/web-ui/components/ui/toast";
import {
  createPortalWalkInAppointment,
  loadPortalWalkInPractices,
  loadPortalWalkInSlots,
} from "../server/actions";

type Practice = Awaited<ReturnType<typeof loadPortalWalkInPractices>>[number];
type Slot = Awaited<ReturnType<typeof loadPortalWalkInSlots>>[number];

function slotLabel(slot: Slot) {
  const date = new Intl.DateTimeFormat("en-IN", {
    timeZone: slot.timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(slot.startsAt));
  return `${date} · ${slot.currency} ${(Number(slot.feeMinor) / 100).toFixed(2)}`;
}

export function NewAppointmentDialog({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [practices, setPractices] = React.useState<Practice[]>([]);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [practiceId, setPracticeId] = React.useState("");
  const [windowId, setWindowId] = React.useState("");
  const [patientName, setPatientName] = React.useState("");
  const [patientPhone, setPatientPhone] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [requestKey, setRequestKey] = React.useState(() => crypto.randomUUID());
  const slotsRequest = React.useRef(0);

  async function showDialog() {
    setOpen(true);
    setLoading(true);
    try {
      const available = await loadPortalWalkInPractices();
      setPractices(available);
    } catch {
      toast.add({
        title: "Could not load doctors",
        description: "Check your connection and try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function choosePractice(id: string) {
    setPracticeId(id);
    setWindowId("");
    setSlots([]);
    const request = ++slotsRequest.current;
    if (!id) {
      setLoadingSlots(false);
      return;
    }
    setLoadingSlots(true);
    try {
      const available = await loadPortalWalkInSlots(id);
      if (request === slotsRequest.current) setSlots(available);
    } catch {
      if (request === slotsRequest.current)
        toast.add({
          title: "Could not load clinic times",
          description: "Try another doctor or reopen this form.",
          type: "error",
        });
    } finally {
      if (request === slotsRequest.current) setLoadingSlots(false);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slot = slots.find((item) => item.windowId === windowId);
    if (!slot || !practiceId || patientName.trim().length < 2) return;
    startTransition(async () => {
      try {
        const result = await createPortalWalkInAppointment({
          practiceId,
          windowId: slot.windowId,
          practiceServiceId: slot.practiceServiceId,
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim(),
          reason: reason.trim(),
          idempotencyKey: requestKey,
        });
        if (result.error) {
          toast.add({
            title: "Could not create appointment",
            description: result.error,
            type: "error",
          });
          return;
        }
        toast.add({
          title: "Appointment created",
          description: "Check the patient in when they arrive.",
          type: "success",
        });
        setOpen(false);
        setPatientName("");
        setPatientPhone("");
        setReason("");
        setPracticeId("");
        setWindowId("");
        setSlots([]);
        setRequestKey(crypto.randomUUID());
        onCreated();
        router.refresh();
      } catch {
        toast.add({
          title: "Could not create appointment",
          description: "Check your connection and try again.",
          type: "error",
        });
      }
    });
  }

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
