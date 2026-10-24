"use client";

import type { NewAppointmentDialogProps } from "../types/newAppointmentDialog";
import type { Practice, Slot } from "../types/newAppointmentDialog";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "@startup/web-ui/components/ui/toast";
import {
  createPortalWalkInAppointment,
  loadPortalWalkInPractices,
  loadPortalWalkInSlots,
} from "../server/actions";

export function useNewAppointment({ onCreated }: NewAppointmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [practices, setPractices] = React.useState<Practice[]>([]);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [clinicDay, setClinicDay] = React.useState<Awaited<
    ReturnType<typeof loadPortalWalkInSlots>
  > | null>(null);
  const [patientAge, setPatientAge] = React.useState("");
  const [patientGender, setPatientGender] = React.useState("");
  const [checkIn, setCheckIn] = React.useState(true);
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

  async function choosePractice(id: string, localDay?: string) {
    setPracticeId(id);
    setWindowId("");
    setSlots([]);
    setClinicDay(null);
    const request = ++slotsRequest.current;
    if (!id) {
      setLoadingSlots(false);
      return;
    }
    setLoadingSlots(true);
    try {
      const available = await loadPortalWalkInSlots(id, localDay);
      if (request === slotsRequest.current) {
        setSlots(available.slots);
        setClinicDay(available);
      }
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
    if (
      !slot ||
      slot.state !== "open" ||
      !clinicDay ||
      clinicDay.walkin_remaining < 1 ||
      !practiceId ||
      patientName.trim().length < 2
    )
      return;
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: clinicDay.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const checkInNow = checkIn && clinicDay.local_day === today;
    startTransition(async () => {
      try {
        const result = await createPortalWalkInAppointment({
          practiceId,
          windowId: slot.windowId,
          practiceServiceId: slot.practiceServiceId,
          patientName: patientName.trim(),
          patientAge: patientAge === "" ? null : Number(patientAge),
          patientGender: patientGender || null,
          checkIn: checkInNow,
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
          await choosePractice(practiceId, clinicDay.local_day);
          return;
        }
        toast.add({
          title: "Appointment created",
          description: checkInNow
            ? "Patient registered and checked in to the queue."
            : "Check the patient in when they arrive.",
          type: "success",
        });
        setOpen(false);
        setPatientName("");
        setPatientAge("");
        setPatientGender("");
        setCheckIn(true);
        setPatientPhone("");
        setReason("");
        setPracticeId("");
        setWindowId("");
        setSlots([]);
        setClinicDay(null);
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

  return {
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
    clinicDay,
    patientAge,
    setPatientAge,
    patientGender,
    setPatientGender,
    checkIn,
    setCheckIn,
    patientName,
    setPatientName,
    patientPhone,
    setPatientPhone,
    reason,
    setReason,
    showDialog,
    choosePractice,
    submit,
  };
}
