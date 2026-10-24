"use client";

import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ClinicAppointment } from "@startup/contracts";
import {
  changePortalAppointmentRecovery,
  loadPortalRecoverySlots,
} from "../server/actions";
import type { PortalRecoveryIntent } from "../types/appointmentRecovery";

export function useAppointmentRecovery(
  item: ClinicAppointment,
  onClose: () => void
) {
  const router = useRouter();
  const [intent, setIntent] = useState<PortalRecoveryIntent | null>(null);
  const [target, setTarget] = useState("");
  const [day, setDay] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();
  const times = useQuery({
    queryKey: ["portal-reschedule-options", item.id],
    queryFn: () => loadPortalRecoverySlots(item.id),
    enabled: intent === "reschedule",
    staleTime: 0,
  });
  function submit() {
    if (!intent || pending) return;
    startTransition(async () => {
      try {
        const request = item.recovery?.request;
        const result =
          intent === "reschedule"
            ? await changePortalAppointmentRecovery("reschedule", {
                appointmentId: item.id,
                expectedVersion: Number(item.row_version),
                targetWindowId: target,
                reason,
                idempotencyKey: key,
              })
            : intent === "approve" || intent === "reject"
              ? await changePortalAppointmentRecovery("decision", {
                  requestId: request?.id,
                  expectedVersion: Number(request?.row_version),
                  approve: intent === "approve",
                  note: reason,
                })
              : await changePortalAppointmentRecovery("attendance", {
                  appointmentId: item.id,
                  expectedVersion: Number(item.row_version),
                  outcome: intent,
                  note: reason,
                });
        if (result.error) {
          setError(result.error);
          router.refresh();
        } else {
          router.refresh();
          onClose();
        }
      } catch {
        setError(
          "Could not update this appointment. Check your connection and retry."
        );
      }
    });
  }
  return {
    intent,
    setIntent,
    target,
    setTarget,
    day,
    setDay,
    reason,
    setReason,
    error,
    pending,
    times,
    submit,
  };
}
