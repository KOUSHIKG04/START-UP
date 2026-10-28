import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentMoney } from "@startup/contracts";
import { getAmbulanceBilling, recordAmbulanceCash } from "@startup/data-access";
import {
  Button,
  Input,
  PaymentSummary,
  PaymentReference,
} from "@startup/mobile-ui";
import { Copy } from "../../../components/DriverUI";
import { supabase } from "../../../services/supabase";

export function TripPayment({ bookingId }: { bookingId: string }) {
  const client = useQueryClient();
  const [note, setNote] = useState("");
  const saved = useQuery({
    queryKey: ["ambulance-billing", bookingId],
    queryFn: () => getAmbulanceBilling(supabase!, bookingId),
    refetchInterval: 30000,
  });
  const mutation = useMutation({
    mutationFn: async () =>
      recordAmbulanceCash(supabase!, {
        bookingId,
        quoteId: saved.data!.quote_id!,
        expectedAmount: saved.data!.amount_minor,
        note,
      }),
    onSuccess: () => setNote(""),
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["ambulance-billing"] }),
        client.invalidateQueries({ queryKey: ["driver-payouts"] }),
      ]);
    },
  });
  if (saved.isLoading) return <Copy>Loading trip payment…</Copy>;
  if (saved.isError)
    return (
      <Button
        theme="driver"
        label="Retry trip payment status"
        variant="outline"
        onPress={() => void saved.refetch()}
      />
    );
  const billing = saved.data;
  if (!billing) return <Copy>Trip payment setup is not available yet.</Copy>;
  if (!billing.enabled && billing.status !== "paid")
    return (
      <Copy>
        New payment collection is disabled. Contact the operator for payment
        arrangements.
      </Copy>
    );
  return (
    <PaymentSummary
      title="Trip payment"
      theme="driver"
      testMode={billing.mode === "test"}
      amount={
        billing.quote_id ? appointmentMoney(billing.amount_minor) : undefined
      }
      amountLabel="Final fare"
      status={
        billing.status === "paid"
          ? "Payment received"
          : billing.status === "authorized"
            ? "Online payment awaiting capture"
            : billing.status === "checking"
              ? "Online payment is being checked"
              : "Payment not completed"
      }
    >
      {!billing.quote_id ? (
        <Copy>Final fare awaiting confirmation by the operator.</Copy>
      ) : null}
      {billing.can_record_cash && billing.quote_id ? (
        <>
          <Input
            label="Cash receipt note"
            value={note}
            onChangeText={setNote}
            maxLength={1000}
            placeholder="Receipt or collection details"
          />
          <Button
            theme="driver"
            label={`Confirm cash received · ${appointmentMoney(billing.amount_minor)}`}
            disabled={mutation.isPending || note.trim().length < 2}
            loading={mutation.isPending}
            onPress={() => mutation.mutate()}
          />
        </>
      ) : null}
      <Button
        theme="driver"
        label="Refresh trip payment"
        variant="outline"
        onPress={() => void saved.refetch()}
      />
      {billing.payment_id ? (
        <PaymentReference value={billing.payment_id} />
      ) : null}
      {mutation.isError ? (
        <Copy accessibilityRole="alert">
          Could not record cash. Refresh payment status before retrying.
        </Copy>
      ) : null}
    </PaymentSummary>
  );
}
