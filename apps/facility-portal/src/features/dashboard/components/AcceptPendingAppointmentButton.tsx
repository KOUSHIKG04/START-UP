"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "@startup/web-ui/components/ui/toast";

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
  const router = useRouter();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const result = await action({
                appointmentId,
                expectedVersion,
                action: "approve",
              });
              if (result.error) toast.add({ title: "Could not update appointment", description: result.error, type: "error" });
              else { toast.add({ title: "Appointment accepted", type: "success" }); router.refresh(); }
            } catch {
              toast.add({ title: "Could not update appointment", description: "Check your connection and try again.", type: "error" });
            }
          })
        }
        className="flex cursor-pointer items-center gap-1 rounded-md bg-[#22c55e] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition-colors hover:bg-[#16a34a] disabled:opacity-50"
      >
        <Check className="size-3 stroke-[2.5]" />
        Accept
      </button>
    </div>
  );
}
