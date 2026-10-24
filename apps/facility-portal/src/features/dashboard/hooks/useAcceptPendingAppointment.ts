"use client";

import { toast } from "@startup/web-ui/components/ui/toast";
import type { AcceptPendingAppointmentButtonProps } from "../types/acceptPendingAppointmentButton";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function useAcceptPendingAppointment({
  appointmentId,
  expectedVersion,
  action,
}: AcceptPendingAppointmentButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const acceptAppointment = () =>
    startTransition(async () => {
      try {
        const result = await action({
          appointmentId,
          expectedVersion,
          action: "approve",
        });
        if (result.error)
          toast.add({
            title: "Could not update appointment",
            description: result.error,
            type: "error",
          });
        else {
          toast.add({ title: "Appointment accepted", type: "success" });
          router.refresh();
        }
      } catch {
        toast.add({
          title: "Could not update appointment",
          description: "Check your connection and try again.",
          type: "error",
        });
      }
    });
  return { acceptAppointment, pending, startTransition, router };
}
