import {
  AppText,
  Button,
  PaymentSummary,
  PaymentRow,
  PaymentReference,
} from "@startup/mobile-ui";
import type { AmbulancePaymentProps } from "../types/ambulance-payment";
import { appointmentMoney } from "@startup/contracts";
import { useAmbulancePayment } from "../hooks/useAmbulancePayment";

export function AmbulancePayment({ bookingId }: AmbulancePaymentProps) {
  const { saved, mutation, pay, refresh } = useAmbulancePayment(bookingId);
  if (saved.isLoading) return <AppText>Loading ambulance payment…</AppText>;
  if (saved.isError)
    return (
      <Button
        theme="patient"
        label="Retry ambulance payment"
        variant="outline"
        onPress={() => void saved.refetch()}
      />
    );
  const billing = saved.data;
  if (!billing)
    return <AppText>Ambulance payment setup is not available yet.</AppText>;
  if (!billing.enabled && billing.status !== "paid")
    return (
      <AppText>
        Online ambulance payments are not enabled. Confirm payment arrangements
        with the operator.
      </AppText>
    );
  return (
    <PaymentSummary
      title="Ambulance payment"
      theme="patient"
      testMode={billing.mode === "test"}
      amount={
        billing.quote_id ? appointmentMoney(billing.amount_minor) : undefined
      }
      amountLabel="Final fare"
      status={
        billing.status === "paid"
          ? `Payment received${billing.method === "cash" ? " in cash" : " online"}`
          : billing.status === "authorized"
            ? "Awaiting payment capture"
            : billing.status === "checking"
              ? "Checking payment status"
              : "Payment not completed"
      }
    >
      {!billing.quote_id ? (
        <AppText>
          The operator is confirming the final fare. You can check it here
          later.
        </AppText>
      ) : (
        <>
          {billing.refunded_minor > 0 ? (
            <PaymentRow
              label="Refunded"
              value={appointmentMoney(billing.refunded_minor)}
            />
          ) : null}
          {billing.can_pay &&
          billing.status !== "authorized" &&
          billing.status !== "checking" ? (
            <Button
              theme="patient"
              label={`Pay online · ${appointmentMoney(billing.amount_minor)}`}
              loading={mutation.isPending}
              disabled={mutation.isPending}
              onPress={() => mutation.mutate(pay)}
            />
          ) : null}
          {billing.status !== "paid" ? (
            <AppText variant="label">
              {billing.method === "gateway"
                ? "An online payment order is open. Refresh its status before discussing another payment method with the operator."
                : "You can also pay the driver directly. They must confirm cash actually received."}{" "}
              Payment does not affect emergency handover.
            </AppText>
          ) : null}
          <Button
            theme="patient"
            label="Refresh payment status"
            variant="outline"
            loading={mutation.isPending}
            disabled={mutation.isPending}
            onPress={() => mutation.mutate(refresh)}
          />
          {billing.payment_id ? (
            <PaymentReference value={billing.payment_id} />
          ) : null}
        </>
      )}
      {mutation.isError ? (
        <AppText accessibilityRole="alert">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Could not update payment. Refresh before retrying."}
        </AppText>
      ) : null}
    </PaymentSummary>
  );
}
