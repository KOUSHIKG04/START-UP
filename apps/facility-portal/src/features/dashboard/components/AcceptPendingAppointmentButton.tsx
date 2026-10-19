"use client";
import { useAcceptPendingAppointment } from "../hooks/useAcceptPendingAppointment";

import type { AcceptPendingAppointmentButtonProps } from "../types/acceptPendingAppointmentButton";

import { Check } from "lucide-react";

export function AcceptPendingAppointmentButton({
  appointmentId,
  expectedVersion,
  action,
}: AcceptPendingAppointmentButtonProps) {
  const { pending, acceptAppointment } = useAcceptPendingAppointment({
    appointmentId,
    expectedVersion,
    action,
  });
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={acceptAppointment}
        className="flex cursor-pointer items-center gap-1 rounded-md bg-[#22c55e] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition-colors hover:bg-[#16a34a] disabled:opacity-50"
      >
        <Check className="size-3 stroke-[2.5]" />
        Accept
      </button>
    </div>
  );
}
