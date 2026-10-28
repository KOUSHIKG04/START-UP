import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  appointmentMoney,
  appointmentPaymentLabel,
  payoutStatusLabel,
  type ClinicAppointment,
} from "@startup/contracts";
import {
  confirmAppointmentCashRefund,
  decideAppointmentRefund,
  getAppointmentBilling,
  processAppointmentPayment,
  recordAppointmentCash,
  listPayoutEntries,
} from "@startup/data-access";
import {
  Button,
  Input,
  PaymentSummary,
  PaymentRow,
  PaymentDivider,
  PaymentDisclosure,
  PaymentReference,
  PaymentStatus,
} from "@startup/mobile-ui";
import { View } from "react-native";
import { Label } from "../../../components/DoctorScreen";
import { supabase } from "../../../services/supabase";

export function AppointmentPaymentPanel({ item }: { item: ClinicAppointment }) {
  const client = useQueryClient();
  const saved = useQuery({
    queryKey: ["appointment-billing", item.id],
    queryFn: () => getAppointmentBilling(supabase!, item.id),
  });
  const [note, setNote] = useState("");
  const payouts = useQuery({
    queryKey: ["appointment-billing", "payouts", item.id],
    queryFn: () => listPayoutEntries(supabase!, { appointmentId: item.id }),
    refetchInterval: 30000,
  });
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: () => setNote(""),
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["appointment-billing"] }),
        client.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] }),
      ]);
    },
  });
  const billing = saved.data;
  if (!billing || (!billing.enabled && !billing.charge_id))
    return saved.isError ? (
      <Button
        theme="doctor"
        label="Retry payment status"
        variant="outline"
        onPress={() => void saved.refetch()}
      />
    ) : null;
  return (
    <PaymentSummary
      title="Payment"
      theme="doctor"
      testMode={billing.mode === "test"}
      amountLabel="Consultation fee"
      amount={appointmentMoney(billing.amount_minor)}
    >
      <PaymentRow
        label="Paid"
        value={appointmentMoney(billing.captured_minor)}
      />
      <PaymentRow
        label="Refunded"
        value={appointmentMoney(billing.refunded_minor)}
      />
      <PaymentDivider />
      <PaymentRow
        label="Balance due"
        value={appointmentMoney(billing.due_minor)}
        emphasis
      />
      {payouts.isError ? (
        <Button
          theme="doctor"
          label="Retry provider payment status"
          variant="outline"
          onPress={() => void payouts.refetch()}
        />
      ) : null}
      {payouts.data?.map((entry) => (
        <ProviderPayment key={entry.id} entry={entry} />
      ))}
      {billing.attempts.length ? (
        <PaymentDisclosure title="Receipts and payment attempts">
          {billing.attempts.map((attempt) => (
            <View key={attempt.id} style={{ gap: 8 }}>
              <PaymentStatus
                theme="doctor"
                label={appointmentPaymentLabel(attempt)}
              />
              {attempt.payment_id ? (
                <PaymentReference value={attempt.payment_id} />
              ) : null}
            </View>
          ))}
        </PaymentDisclosure>
      ) : null}
      {billing.can_manage ? (
        <Input
          label="Financial action note"
          placeholder="Record the decision or receipt details"
          value={note}
          maxLength={1000}
          onChangeText={setNote}
          multiline
          disabled={mutation.isPending}
        />
      ) : null}
      {billing.can_manage &&
      billing.enabled &&
      item.visit_mode === "clinic" &&
      item.status === "confirmed" &&
      billing.appointment_id === item.id &&
      billing.due_minor > 0 ? (
        <>
          <Label>
            Confirm cash has been received and the patient has accepted the
            displayed payment terms.
          </Label>
          <PaymentDisclosure title="Payment and refund terms">
            <Label>{billing.policy_text}</Label>
          </PaymentDisclosure>
          <Button
            theme="doctor"
            label={`Confirm cash received · ${appointmentMoney(billing.due_minor)}`}
            disabled={mutation.isPending || note.trim().length < 2}
            onPress={() =>
              mutation.mutate(() =>
                recordAppointmentCash(
                  supabase!,
                  item.id,
                  billing.due_minor,
                  note
                )
              )
            }
          />
        </>
      ) : null}
      {billing.refunds.map((refund) => (
        <View key={refund.id} style={{ gap: 12 }}>
          <PaymentDivider />
          <PaymentStatus theme="doctor" label={`Refund ${refund.status}`} />
          <PaymentRow
            label="Refund amount"
            value={appointmentMoney(refund.amount_minor)}
          />
          <PaymentRow
            label="Deduction"
            value={appointmentMoney(refund.deduction_minor)}
          />
          <Label>{refund.reason}</Label>
          {refund.decision_note ? <Label>{refund.decision_note}</Label> : null}
          {refund.references.map((reference) => (
            <PaymentReference
              key={reference}
              label="Refund reference"
              value={reference}
            />
          ))}
          {billing.can_manage && refund.status === "requested" ? (
            <>
              <Button
                theme="doctor"
                label="Approve refund"
                disabled={mutation.isPending || note.trim().length < 2}
                onPress={() =>
                  mutation.mutate(async () => {
                    await decideAppointmentRefund(supabase!, {
                      refundId: refund.id,
                      expectedVersion: refund.row_version,
                      approve: true,
                      note,
                    });
                    await processAppointmentPayment(supabase!, {
                      action: "process_refunds",
                      appointmentId: item.id,
                    });
                  })
                }
              />
              <Button
                theme="doctor"
                label="Decline refund"
                variant="outline"
                disabled={mutation.isPending || note.trim().length < 2}
                onPress={() =>
                  mutation.mutate(() =>
                    decideAppointmentRefund(supabase!, {
                      refundId: refund.id,
                      expectedVersion: refund.row_version,
                      approve: false,
                      note,
                    })
                  )
                }
              />
            </>
          ) : null}
          {billing.can_manage && refund.cash_pending ? (
            <Button
              theme="doctor"
              label="Confirm refund cash returned"
              disabled={mutation.isPending || note.trim().length < 2}
              onPress={() =>
                mutation.mutate(() =>
                  confirmAppointmentCashRefund(supabase!, refund.id, note)
                )
              }
            />
          ) : null}
        </View>
      ))}
      {mutation.isError ? (
        <Label>
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Could not update payment. Refresh and retry."}
        </Label>
      ) : null}
      <Button
        theme="doctor"
        label="Refresh payment status"
        variant="outline"
        disabled={mutation.isPending}
        onPress={() =>
          mutation.mutate(() =>
            processAppointmentPayment(supabase!, {
              action: "reconcile",
              appointmentId: item.id,
            })
          )
        }
      />
      {billing.can_manage &&
      billing.refunds.some((refund) =>
        ["approved", "processing"].includes(refund.status)
      ) ? (
        <Button
          theme="doctor"
          label="Process or reconcile refunds"
          variant="outline"
          disabled={mutation.isPending}
          onPress={() =>
            mutation.mutate(() =>
              processAppointmentPayment(supabase!, {
                action: "process_refunds",
                appointmentId: item.id,
              })
            )
          }
        />
      ) : null}
    </PaymentSummary>
  );
}

function ProviderPayment({
  entry,
}: {
  entry: import("@startup/contracts").PayoutEntry;
}) {
  return (
    <View style={{ gap: 8 }}>
      <PaymentDivider />
      <PaymentStatus theme="doctor" label={payoutStatusLabel(entry)} />
      <PaymentDisclosure
        title={`Provider payment · ${entry.recipient_name ?? "Recipient not configured"}`}
      >
        <PaymentRow
          label="Company fee"
          value={
            entry.company_minor === null
              ? "Not configured"
              : appointmentMoney(entry.company_minor)
          }
        />
        <PaymentRow
          label="Provider share"
          value={
            entry.provider_minor === null
              ? "Not configured"
              : appointmentMoney(entry.provider_minor)
          }
          emphasis
        />
        {entry.method !== "gateway" ? (
          <Label>
            Collected directly · Company fee due{" "}
            {entry.cash_due_minor === null
              ? "Not configured"
              : appointmentMoney(entry.cash_due_minor)}
          </Label>
        ) : null}
        {entry.transfer_id ? (
          <PaymentReference
            label="Transfer reference"
            value={entry.transfer_id}
          />
        ) : null}
      </PaymentDisclosure>
    </View>
  );
}
