"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";

export function AcceptPendingAppointmentButton({
  appointmentId,
  expectedVersion,
  action,
}: {
  appointmentId: string;
  expectedVersion: number;
  action: (input: unknown) => Promise<{ error: string | null }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await action({
              appointmentId,
              expectedVersion,
              action: "approve",
            });
            setError(result.error);
            if (!result.error) window.location.reload();
          })
        }
        className="flex cursor-pointer items-center gap-1 rounded-md bg-[#22c55e] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition-colors hover:bg-[#16a34a] disabled:opacity-50"
      >
        <Check className="size-3 stroke-[2.5]" />
        Accept
      </button>
      {error && (
        <p role="alert" className="mt-1 text-[11px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
