import type { ClinicAppointment } from "@startup/contracts";
import { appointmentRecoveryView } from "@startup/contracts";
import { AppointmentRecoveryDialog } from "@startup/mobile-ui";
import { useAppointmentRecovery } from "../hooks/useAppointmentRecovery";

export function AppointmentRecovery({
  item,
  intent,
  onClose,
}: {
  item: ClinicAppointment;
  intent: "reschedule" | "review";
  onClose: () => void;
}) {
  const recovery = useAppointmentRecovery(item, intent, onClose);
  const view = appointmentRecoveryView(item);
  return (
    <AppointmentRecoveryDialog
      visible
      theme="patient"
      title={
        intent === "review"
          ? "Report an appointment problem"
          : "Reschedule appointment"
      }
      description={
        intent === "review"
          ? "Describe what happened. The clinic will review attendance before deciding the outcome."
          : view.requiresApproval
            ? "Choose a preferred time. The clinic must approve this change; the time is not reserved yet."
            : "Choose a new available time. Your original booking changes only after confirmation."
      }
      actionLabel={
        intent === "review"
          ? "Send for review"
          : view.requiresApproval
            ? "Request reschedule"
            : "Confirm reschedule"
      }
      times={
        intent === "reschedule"
          ? (recovery.times.data ?? []).map((slot) => ({
              value: slot.window_id,
              day: new Date(slot.starts_at).toLocaleDateString("en-CA", {
                timeZone: slot.timezone,
              }),
              dayLabel: new Date(slot.starts_at).toLocaleDateString("en-IN", {
                timeZone: slot.timezone,
                dateStyle: "medium",
              }),
              label: new Date(slot.starts_at).toLocaleTimeString("en-IN", {
                timeZone: slot.timezone,
                hour: "numeric",
                minute: "2-digit",
              }),
              fee: new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: slot.currency,
              }).format(Number(slot.fee_minor) / 100),
            }))
          : undefined
      }
      busy={recovery.mutation.isPending}
      loading={intent === "reschedule" && recovery.times.isLoading}
      error={
        recovery.mutation.error
          ? typeof recovery.mutation.error === "object" &&
            "message" in recovery.mutation.error
            ? String(recovery.mutation.error.message)
            : "Could not update this appointment. Refresh and try again."
          : intent === "reschedule" && recovery.times.isError
            ? "Could not load available times."
            : undefined
      }
      onRetry={() => {
        recovery.mutation.reset();
        if (intent === "reschedule") void recovery.times.refetch();
      }}
      onClose={onClose}
      onSubmit={(value) => recovery.mutation.mutate(value)}
    />
  );
}
