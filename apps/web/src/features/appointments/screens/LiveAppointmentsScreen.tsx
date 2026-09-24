"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ClinicAppointment,
  ClinicPractice,
  ClinicSession,
} from "@startup/contracts";
import { Button } from "@startup/web-ui/components/ui/button";
import {
  changePortalAppointment,
  changePortalAutoConfirmLimit,
  redeemPortalCheckinToken,
} from "../server/actions";

export function LiveAppointmentsScreen({
  practices,
  appointments,
  sessions,
  selectedPracticeId,
  loadError,
}: {
  practices: ClinicPractice[];
  appointments: ClinicAppointment[];
  sessions: ClinicSession[];
  selectedPracticeId: string | null;
  loadError?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [checkinToken, setCheckinToken] = useState("");
  const [autoLimits, setAutoLimits] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refresh, 15000);
    return () => window.clearInterval(timer);
  }, [router]);
  function act(
    appointment: ClinicAppointment,
    action:
      | "approve"
      | "reject"
      | "check_in"
      | "call"
      | "hold"
      | "resume"
      | "no_show"
      | "cancel"
  ) {
    startTransition(async () => {
      const result = await changePortalAppointment({
        appointmentId: appointment.id,
        expectedVersion: Number(appointment.row_version),
        action,
        note: action === "reject" || action === "hold" ? note : null,
      });
      setMessage(result.error ?? "Appointment updated.");
      if (!result.error) {
        setNote("");
        router.refresh();
      }
    });
  }
  return (
    <div className="flex flex-col gap-5 pb-12">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Appointments</h1>
        <p className="text-muted-foreground text-sm">
          Live requests and check-in for the selected practice.
        </p>
      </div>
      {loadError ? (
        <p
          role="alert"
          className="border-destructive text-destructive rounded-md border p-3 text-sm"
        >
          {loadError}
        </p>
      ) : null}
      <form method="get" className="flex flex-wrap items-center gap-3">
        <label htmlFor="practice" className="text-sm font-medium">
          Practice
        </label>
        <select
          id="practice"
          name="practice"
          defaultValue={selectedPracticeId ?? ""}
          className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        >
          {practices.map((practice) => (
            <option key={practice.practice_id} value={practice.practice_id}>
              {practice.doctor_name} · {practice.facility_name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          View
        </Button>
      </form>
      <div className="border-border bg-card flex max-w-xl flex-col gap-2 rounded-xl border p-4">
        <label htmlFor="checkin-token" className="text-sm font-medium">
          Patient check-in QR token
        </label>
        <input
          id="checkin-token"
          value={checkinToken}
          onChange={(event) => setCheckinToken(event.target.value.trim())}
          autoComplete="off"
          className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        />
        <Button
          type="button"
          disabled={pending || !checkinToken}
          onClick={() =>
            startTransition(async () => {
              const result = await redeemPortalCheckinToken(checkinToken);
              setMessage(result.error ?? "Patient checked in.");
              if (!result.error) {
                setCheckinToken("");
                router.refresh();
              }
            })
          }
        >
          Redeem check-in QR
        </Button>
      </div>
      {practices.length === 0 && !loadError ? (
        <p>No authorized practices are linked to this account.</p>
      ) : null}
      {selectedPracticeId && appointments.length === 0 ? (
        <p>No appointments for this practice yet.</p>
      ) : null}
      {sessions.length ? (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Clinic sessions</h2>
          <p className="text-muted-foreground text-sm">
            The first N bookings confirm automatically. Set 0 for manual
            approval.
          </p>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="border-border bg-card rounded-xl border p-4"
            >
              <p className="font-medium">
                {new Date(session.starts_at).toLocaleString()} · {session.state}
              </p>
              <p className="text-muted-foreground text-sm">
                Capacity {session.hard_capacity} · current auto-confirm limit{" "}
                {session.auto_confirm_limit ?? 0}
              </p>
              <label className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                Auto-confirm limit
                <input
                  type="number"
                  min={0}
                  max={session.hard_capacity}
                  value={
                    autoLimits[session.id] ??
                    String(session.auto_confirm_limit ?? 0)
                  }
                  onChange={(event) =>
                    setAutoLimits((current) => ({
                      ...current,
                      [session.id]: event.target.value,
                    }))
                  }
                  className="border-input bg-background w-20 rounded-md border px-2 py-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await changePortalAutoConfirmLimit({
                        sessionId: session.id,
                        expectedVersion: Number(session.row_version),
                        limit: Number(
                          autoLimits[session.id] ??
                            session.auto_confirm_limit ??
                            0
                        ),
                      });
                      setMessage(result.error ?? "Auto-confirm limit updated.");
                      if (!result.error) router.refresh();
                    })
                  }
                >
                  Save
                </Button>
              </label>
            </div>
          ))}
        </section>
      ) : null}
      <label className="flex max-w-xl flex-col gap-1 text-sm">
        Reason for rejection or hold
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          className="border-input bg-background min-h-20 rounded-md border p-3"
        />
      </label>
      {message ? (
        <p role="status" className="text-sm">
          {message}
        </p>
      ) : null}
      <div className="grid gap-3">
        {appointments.map((appointment) => (
          <article
            key={appointment.id}
            className="border-border bg-card rounded-xl border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{appointment.patient_name}</h2>
              <span className="text-sm font-medium">{appointment.status}</span>
            </div>
            <p className="text-muted-foreground text-sm">
              {appointment.doctor_name} · {appointment.public_code} ·{" "}
              {new Date(appointment.starts_at).toLocaleString()}
            </p>
            {appointment.reason ? (
              <p className="mt-2 text-sm">Reason: {appointment.reason}</p>
            ) : null}
            {appointment.queue_state ? (
              <p className="mt-2 text-sm">
                Queue: {appointment.queue_state} · Ticket{" "}
                {appointment.ticket_number ?? "pending"}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {appointment.status === "pending" ? (
                <>
                  <Button
                    disabled={pending}
                    onClick={() => act(appointment, "approve")}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending || !note.trim()}
                    onClick={() => act(appointment, "reject")}
                  >
                    Reject
                  </Button>
                </>
              ) : null}
              {appointment.status === "confirmed" &&
              appointment.queue_state === "awaiting_arrival" ? (
                <Button
                  disabled={pending}
                  onClick={() => act(appointment, "check_in")}
                >
                  Check in
                </Button>
              ) : null}
              {appointment.status === "confirmed" &&
              appointment.queue_state === "waiting" ? (
                <Button
                  disabled={pending}
                  onClick={() => act(appointment, "call")}
                >
                  Call patient
                </Button>
              ) : null}
              {appointment.status === "confirmed" &&
              (appointment.queue_state === "waiting" ||
                appointment.queue_state === "called") ? (
                <Button
                  variant="outline"
                  disabled={pending || !note.trim()}
                  onClick={() => act(appointment, "hold")}
                >
                  Hold
                </Button>
              ) : null}
              {appointment.status === "confirmed" &&
              appointment.queue_state === "held" ? (
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => act(appointment, "resume")}
                >
                  Return to queue
                </Button>
              ) : null}
              {appointment.status === "confirmed" &&
              appointment.queue_state &&
              !["in_service", "completed", "cancelled", "no_show"].includes(
                appointment.queue_state
              ) &&
              new Date(appointment.ends_at).getTime() <= Date.now() ? (
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => act(appointment, "no_show")}
                >
                  Mark no-show
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
