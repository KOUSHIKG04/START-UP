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
