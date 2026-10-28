"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  appointmentMoney,
  appointmentPaymentLabel,
  payoutStatusLabel,
  type ClinicAppointment,
} from "@startup/contracts";
import { Button } from "@startup/web-ui/components/ui/button";
import {
  PaymentSummary,
  PaymentStatusLabel,
} from "@startup/web-ui/components/payment-summary";
import {
  changePortalAppointmentBilling,
  loadPortalAppointmentBilling,
  loadPortalAppointmentPayouts,
} from "../server/paymentActions";

export function AppointmentPaymentPanel({ item }: { item: ClinicAppointment }) {
  const client = useQueryClient();
  const router = useRouter();
  const [note, setNote] = useState("");
  const payouts = useQuery({
    queryKey: ["appointment-billing", "payouts", item.id],
    queryFn: () => loadPortalAppointmentPayouts(item.id),
    refetchInterval: 30000,
  });
  const saved = useQuery({
    queryKey: ["appointment-billing", item.id],
    queryFn: () => loadPortalAppointmentBilling(item.id),
  });
  const mutation = useMutation({
    mutationFn: async (input: unknown) => {
      const result = await changePortalAppointmentBilling(input);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => setNote(""),
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ["appointment-billing"] });
      router.refresh();
    },
  });
  const billing = saved.data;
  if (!billing)
    return saved.isError ? (
      <Button variant="outline" onClick={() => void saved.refetch()}>
        Retry payment status
      </Button>
    ) : null;
  if (!billing.enabled && !billing.charge_id) return null;
  const disabled = mutation.isPending || note.trim().length < 2;
  return (
    <PaymentSummary
      title="Payment"
      amount={appointmentMoney(billing.amount_minor)}
      amountLabel="Consultation fee"
      testMode={billing.mode === "test"}
    >
      <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
        <dt>Paid</dt>
        <dd className="text-right tabular-nums">
          {appointmentMoney(billing.captured_minor)}
        </dd>
        <dt>Refunded</dt>
        <dd className="text-right tabular-nums">
          {appointmentMoney(billing.refunded_minor)}
        </dd>
        <dt className="border-t pt-3 font-medium">Balance due</dt>
        <dd className="border-t pt-3 text-right font-semibold tabular-nums">
          {appointmentMoney(billing.due_minor)}
        </dd>
      </dl>
      {payouts.isError ? (
        <Button variant="outline" onClick={() => void payouts.refetch()}>
          Retry provider payment status
        </Button>
      ) : null}
      {payouts.data?.map((entry) => (
        <div key={entry.id} className="space-y-1 border-t pt-3 text-sm">
          <PaymentStatusLabel>{payoutStatusLabel(entry)}</PaymentStatusLabel>
          <h4 className="pt-2 font-medium">
            {entry.recipient_name ?? "Recipient not configured"}
          </h4>
          <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-2 py-2">
            <dt>Company fee</dt>
            <dd className="text-right tabular-nums">
              {entry.company_minor === null
                ? "Not configured"
                : appointmentMoney(entry.company_minor)}
            </dd>
            <dt>Provider share</dt>
            <dd className="text-right font-semibold tabular-nums">
              {entry.provider_minor === null
                ? "Not configured"
                : appointmentMoney(entry.provider_minor)}
            </dd>
          </dl>
          {entry.method !== "gateway" ? (
            <p>
              Collected directly · Company fee due{" "}
              {entry.cash_due_minor === null
                ? "Not configured"
                : appointmentMoney(entry.cash_due_minor)}
            </p>
          ) : null}
          {entry.transfer_id ? (
            <p className="break-all">Transfer {entry.transfer_id}</p>
          ) : null}
        </div>
      ))}
      {billing.attempts.length ? (
        <details className="border-t pt-2">
          <summary className="focus-visible:outline-ring cursor-pointer py-2 text-sm font-medium focus-visible:outline-2">
            Receipts and payment attempts
          </summary>
          <div className="space-y-3 py-2">
            {billing.attempts.map((attempt) => (
              <div key={attempt.id} className="space-y-1 text-sm">
                <p>{appointmentPaymentLabel(attempt)}</p>
                {attempt.payment_id ? (
                  <p className="text-muted-foreground [overflow-wrap:anywhere] select-text">
                    {attempt.payment_id}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
      {billing.can_manage ? (
        <label className="block space-y-1 text-sm">
          Financial action note
          <textarea
            className="border-border bg-background min-h-20 w-full rounded-lg border px-3 py-2"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            disabled={mutation.isPending}
          />
        </label>
      ) : null}
      {billing.can_manage &&
      billing.enabled &&
      item.visit_mode === "clinic" &&
      item.status === "confirmed" &&
      billing.appointment_id === item.id &&
      billing.due_minor > 0 ? (
        <>
          <p className="text-muted-foreground text-sm">
            Confirm cash has been received and the patient has accepted these
            payment terms. {billing.policy_text}
          </p>
          <Button
            disabled={disabled}
            onClick={() =>
              mutation.mutate({
                action: "cash",
                appointmentId: item.id,
                expectedDue: billing.due_minor,
                note,
              })
            }
          >
            Confirm cash received · {appointmentMoney(billing.due_minor)}
          </Button>
        </>
      ) : null}
      {billing.refunds.map((refund) => (
        <div
          className="border-border space-y-3 border-t pt-4 text-sm"
          key={refund.id}
        >
          <PaymentStatusLabel>Refund {refund.status}</PaymentStatusLabel>
          <div className="flex flex-wrap justify-between gap-2 font-medium">
            <p>Refund amount</p>
            <p className="tabular-nums">
              {appointmentMoney(refund.amount_minor)}
            </p>
          </div>
          <p>
            Deduction {appointmentMoney(refund.deduction_minor)} ·{" "}
            {refund.reason}
          </p>
          {refund.decision_note ? <p>{refund.decision_note}</p> : null}
          {refund.references.map((reference) => (
            <p className="break-words" key={reference}>
              {reference}
            </p>
          ))}
          {billing.can_manage && refund.status === "requested" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={disabled}
                onClick={() =>
                  mutation.mutate({
                    action: "decision",
                    appointmentId: item.id,
                    refundId: refund.id,
                    expectedVersion: refund.row_version,
                    approve: true,
                    note,
                  })
                }
              >
                Approve refund
              </Button>
              <Button
                variant="outline"
                disabled={disabled}
                onClick={() =>
                  mutation.mutate({
                    action: "decision",
                    appointmentId: item.id,
                    refundId: refund.id,
                    expectedVersion: refund.row_version,
                    approve: false,
                    note,
                  })
                }
              >
                Decline refund
              </Button>
            </div>
          ) : null}
          {billing.can_manage && refund.cash_pending ? (
            <Button
              disabled={disabled}
              onClick={() =>
                mutation.mutate({
                  action: "cash_refund",
                  appointmentId: item.id,
                  refundId: refund.id,
                  note,
                })
              }
            >
              Confirm refund cash returned
            </Button>
          ) : null}
        </div>
      ))}
      {mutation.isError ? (
        <p role="alert" className="text-destructive text-sm">
          {mutation.error.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({ action: "reconcile", appointmentId: item.id })
          }
        >
          Refresh payment status
        </Button>
        {billing.can_manage &&
        billing.refunds.some((refund) =>
          ["approved", "processing"].includes(refund.status)
        ) ? (
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate({
                action: "process_refunds",
                appointmentId: item.id,
              })
            }
          >
            Process or reconcile refunds
          </Button>
        ) : null}
      </div>
    </PaymentSummary>
  );
}
