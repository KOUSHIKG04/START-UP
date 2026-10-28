import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  appointmentMoney,
  appointmentPaymentLabel,
  type ClinicAppointment,
} from "@startup/contracts";
import {
  getAppointmentBilling,
  processAppointmentPayment,
  requestAppointmentRefund,
} from "@startup/data-access";
import {
  AppDialog,
  AppText,
  Button,
  Checkbox,
  Input,
  PaymentSummary,
  PaymentRow,
  PaymentDivider,
  PaymentDisclosure,
  PaymentReference,
  PaymentStatus,
} from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";
import { payForAppointment } from "../../../services/paymentCheckout";

export function AppointmentPayment({ item }: { item: ClinicAppointment }) {
  const client = useQueryClient();
  const saved = useQuery({
    queryKey: ["appointment-billing", item.id],
    queryFn: () => getAppointmentBilling(supabase!, item.id),
  });
  const [accepted, setAccepted] = useState("");
  const [kind, setKind] = useState<"cancel" | "surplus" | null>(null);
  const [reason, setReason] = useState("");
  const billing = saved.data;
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: () => {
      setKind(null);
      setReason("");
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["appointment-billing"] }),
        client.invalidateQueries({ queryKey: ["patient-clinic-appointments"] }),
      ]);
    },
  });
  if (saved.isLoading) return <AppText>Loading payment…</AppText>;
  if (!billing)
    return saved.isError ? (
      <Button
        label="Retry payment status"
        theme="patient"
        variant="outline"
        onPress={() => void saved.refetch()}
      />
    ) : null;
  if (!billing.enabled && !billing.charge_id) return null;
  const active = billing.appointment_id === item.id;
  const amount =
    kind === "surplus" ? billing.surplus_minor : billing.refund_amount_minor;
  const deduction = kind === "surplus" ? 0 : billing.refund_deduction_minor;
  const pay = async () => {
    await payForAppointment(supabase!, {
      appointmentId: item.id,
      policyVersion: billing.policy_version,
      patientName: item.patient_name,
      reservation: item.confirmation_payment_pending,
    });
  };
  return (
    <PaymentSummary
      title="Payment"
      theme="patient"
      testMode={billing.mode === "test"}
      amount={appointmentMoney(billing.amount_minor)}
      amountLabel="Consultation fee"
      status={
        billing.due_minor > 0
          ? "Balance due"
          : billing.captured_minor > 0 && billing.refunded_minor === 0
            ? "Payment received"
            : undefined
      }
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
      {billing.credit_minor > billing.amount_minor ? (
        <PaymentRow
          label="Unused credit"
          value={appointmentMoney(billing.surplus_minor)}
        />
      ) : null}
      {!active ? (
        <AppText>This receipt follows your replacement appointment.</AppText>
      ) : null}
      {billing.can_pay ? (
        <>
          <PaymentDisclosure title="Payment and refund terms">
            <AppText>{billing.policy_text}</AppText>
          </PaymentDisclosure>
          <Checkbox
            theme="patient"
            label="I agree to these payment and refund terms"
            checked={accepted === billing.policy_version}
            onCheckedChange={(value) =>
              setAccepted(value ? billing.policy_version : "")
            }
            disabled={mutation.isPending}
          />
          <Button
            theme="patient"
            label={`Pay ${appointmentMoney(billing.due_minor)}`}
            disabled={mutation.isPending || accepted !== billing.policy_version}
            loading={mutation.isPending}
            onPress={() => mutation.mutate(pay)}
          />
        </>
      ) : null}
      {billing.attempts.length ? (
        <PaymentDisclosure title="Receipts and payment attempts">
          {billing.attempts.map((attempt) => (
            <View key={attempt.id} style={{ gap: 8 }}>
              <PaymentStatus
                theme="patient"
                label={appointmentPaymentLabel(attempt)}
              />
              {attempt.payment_id ? (
                <PaymentReference value={attempt.payment_id} />
              ) : null}
            </View>
          ))}
        </PaymentDisclosure>
      ) : null}
      {billing.refunds.map((refund) => (
        <View key={refund.id} style={{ gap: 10 }}>
          <PaymentDivider />
          <PaymentStatus theme="patient" label={`Refund ${refund.status}`} />
          <PaymentRow
            label="Refund amount"
            value={appointmentMoney(refund.amount_minor)}
          />
          {refund.deduction_minor > 0 ? (
            <PaymentRow
              label="Deduction"
              value={appointmentMoney(refund.deduction_minor)}
            />
          ) : null}
          {refund.decision_note ? (
            <AppText>{refund.decision_note}</AppText>
          ) : null}
          {refund.references.map((reference) => (
            <PaymentReference
              key={reference}
              label="Refund reference"
              value={reference}
            />
          ))}
        </View>
      ))}
      {billing.can_refund && !kind ? (
        <>
          {billing.surplus_minor > 0 ? (
            <Button
              theme="patient"
              label="Request unused-credit refund"
              variant="outline"
              disabled={mutation.isPending}
              onPress={() => setKind("surplus")}
            />
          ) : null}
          {billing.refund_amount_minor > 0 &&
          item.status !== "in_consultation" &&
          item.status !== "completed" ? (
            <Button
              theme="patient"
              label="Request cancellation refund"
              variant="outline"
              disabled={mutation.isPending}
              onPress={() => setKind("cancel")}
            />
          ) : null}
        </>
      ) : null}
      <AppDialog
        visible={Boolean(kind)}
        title={
          kind === "surplus"
            ? "Return unused credit"
            : "Request cancellation refund"
        }
        theme="patient"
        busy={mutation.isPending}
        onClose={() => setKind(null)}
        description={
          kind === "cancel"
            ? "Approval cancels this appointment. You cannot also use the refunded payment to reschedule."
            : "Your appointment stays booked; only unused credit is returned."
        }
        actions={
          <>
            <Button
              theme="patient"
              label="Confirm refund request"
              disabled={mutation.isPending || reason.trim().length < 2}
              onPress={() =>
                mutation.mutate(() =>
                  requestAppointmentRefund(supabase!, {
                    appointmentId: item.id,
                    kind: kind!,
                    reason,
                    expectedAmount: amount,
                    expectedDeduction: deduction,
                  })
                )
              }
            />
            <Button
              theme="patient"
              label="Keep appointment"
              variant="outline"
              disabled={mutation.isPending}
              onPress={() => setKind(null)}
            />
          </>
        }
      >
        <PaymentRow
          label="Amount eligible"
          value={appointmentMoney(amount + deduction)}
        />
        <PaymentRow label="Deduction" value={appointmentMoney(deduction)} />
        <PaymentDivider />
        <PaymentRow
          label="Refund amount"
          value={appointmentMoney(amount)}
          emphasis
        />
        <Input
          label="Reason for refund"
          value={reason}
          onChangeText={setReason}
          maxLength={1000}
          multiline
          disabled={mutation.isPending}
        />
        {mutation.isError ? (
          <AppText accessibilityRole="alert">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Could not update payment. Refresh and retry."}
          </AppText>
        ) : null}
      </AppDialog>
      {mutation.isError && !kind ? (
        <AppText accessibilityRole="alert">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Could not update payment. Refresh and retry."}
        </AppText>
      ) : null}
      <Button
        theme="patient"
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
    </PaymentSummary>
  );
}
