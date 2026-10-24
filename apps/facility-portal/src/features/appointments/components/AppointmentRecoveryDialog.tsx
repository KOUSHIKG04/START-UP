"use client";

import {
  appointmentRecoveryView,
  type ClinicAppointment,
} from "@startup/contracts";
import { Button } from "@startup/web-ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@startup/web-ui/components/ui/dialog";
import { useAppointmentRecovery } from "../hooks/useAppointmentRecovery";

export function AppointmentRecoveryDialog({
  item,
  onClose,
}: {
  item: ClinicAppointment;
  onClose: () => void;
}) {
  const {
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
  } = useAppointmentRecovery(item, onClose);
  const view = appointmentRecoveryView(item);
  const request = item.recovery?.request;
  const dayKey = (value: string) =>
    new Date(value).toLocaleDateString("en-CA", { timeZone: item.timezone });
  const days = [
    ...new Set((times.data ?? []).map((slot) => dayKey(slot.starts_at))),
  ];
  const selected = times.data?.find((slot) => slot.window_id === target);
  const field =
    "border-border bg-background w-full min-w-0 rounded-lg border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>Manage appointment</DialogTitle>
        <DialogDescription>
          {item.patient_name} · {view.staffStatus} ·{" "}
          {item.public_code.slice(-8)}
        </DialogDescription>
        {view.message ? <p className="text-sm">{view.message}</p> : null}
        {request ? (
          <div className="space-y-2 text-sm">
            <p>
              {request.kind === "reschedule"
                ? "Reschedule"
                : "Attendance review"}{" "}
              request · {request.status}
            </p>
            <p>{request.reason}</p>
            {request.target_starts_at ? (
              <p>
                Requested time:{" "}
                {new Date(request.target_starts_at).toLocaleString("en-IN", {
                  timeZone: item.timezone,
                })}
              </p>
            ) : null}
            {request.decision_note ? <p>{request.decision_note}</p> : null}
          </div>
        ) : null}
        {!intent ? (
          <div className="flex flex-wrap gap-2">
            {view.canReschedule ? (
              <Button onClick={() => setIntent("reschedule")}>
                Reschedule
              </Button>
            ) : null}
            {view.canMarkNoShow ? (
              <Button variant="outline" onClick={() => setIntent("no_show")}>
                Mark patient no-show
              </Button>
            ) : null}
            {view.canMarkDoctorUnavailable ? (
              <Button
                variant="outline"
                onClick={() => setIntent("doctor_unavailable")}
              >
                Doctor unavailable
              </Button>
            ) : null}
            {request?.status === "pending" ? (
              <>
                <Button onClick={() => setIntent("approve")}>
                  {request.kind === "reschedule"
                    ? "Approve reschedule"
                    : "Resolve review"}
                </Button>
                <Button variant="outline" onClick={() => setIntent("reject")}>
                  Decline request
                </Button>
              </>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              {intent === "no_show"
                ? "Confirm the patient did not attend. A checked-in patient may still be waiting because the clinic is delayed."
                : intent === "reschedule"
                  ? "Choose a new time. The original booking changes only when the replacement succeeds."
                  : "Confirm your decision. The patient will see your note."}
            </p>
            {intent === "reschedule" ? (
              times.isLoading ? (
                <p role="status">Loading available times…</p>
              ) : times.isError ? (
                <div>
                  <p role="alert">Could not load available times.</p>
                  <Button
                    variant="outline"
                    onClick={() => void times.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : days.length ? (
                <>
                  <label className="block space-y-2 text-sm">
                    <span>New date</span>
                    <select
                      className={field}
                      value={day}
                      disabled={pending}
                      onChange={(event) => {
                        setDay(event.target.value);
                        setTarget("");
                      }}
                    >
                      <option value="">Choose date</option>
                      {days.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-2 text-sm">
                    <span>New time</span>
                    <select
                      className={field}
                      value={target}
                      disabled={pending || !day}
                      onChange={(event) => setTarget(event.target.value)}
                    >
                      <option value="">Choose time</option>
                      {times.data
                        ?.filter((slot) => dayKey(slot.starts_at) === day)
                        .map((slot) => (
                          <option key={slot.window_id} value={slot.window_id}>
                            {new Date(slot.starts_at).toLocaleTimeString(
                              "en-IN",
                              {
                                timeZone: slot.timezone,
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </option>
                        ))}
                    </select>
                  </label>
                  {selected ? (
                    <p className="text-sm">
                      Consultation fee:{" "}
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: selected.currency,
                      }).format(Number(selected.fee_minor) / 100)}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm">No replacement times are available.</p>
              )
            ) : null}
            <label className="block space-y-2 text-sm">
              <span>
                {intent === "no_show"
                  ? "Note (optional)"
                  : "Reason / decision note"}
              </span>
              <textarea
                className={field}
                value={reason}
                maxLength={1000}
                rows={3}
                disabled={pending}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
            <Button
              disabled={
                pending ||
                (intent !== "no_show" && reason.trim().length < 2) ||
                (intent === "reschedule" &&
                  (!selected || times.isLoading || times.isError))
              }
              onClick={submit}
            >
              {pending ? "Saving…" : "Confirm decision"}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setIntent(null)}
            >
              Back
            </Button>
          </div>
        )}
        <Button variant="outline" disabled={pending} onClick={onClose}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
