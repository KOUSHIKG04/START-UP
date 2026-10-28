import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentCheckoutSchema } from "@startup/contracts";
import {
  getAmbulanceBilling,
  processAmbulancePayment,
} from "@startup/data-access";
import { supabase } from "../../../services/supabase";
import { loadPaymentCheckout } from "../../../services/paymentCheckout";

export function useAmbulancePayment(bookingId: string) {
  const client = useQueryClient();
  const saved = useQuery({
    queryKey: ["ambulance-billing", bookingId],
    queryFn: () => getAmbulanceBilling(supabase!, bookingId),
    enabled: Boolean(supabase),
    refetchInterval: 30000,
  });
  const refresh = async () => {
    if (saved.data?.status === "paid" || !saved.data?.quote_id)
      return saved.refetch();
    return processAmbulancePayment(supabase!, {
      resourceType: "ambulance",
      action: "reconcile",
      bookingId,
    });
  };
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSettled: () =>
      client.invalidateQueries({ queryKey: ["ambulance-billing", bookingId] }),
  });
  const pay = async () => {
    const open = await loadPaymentCheckout("ambulance");
    const checkout = appointmentCheckoutSchema.parse(
      await processAmbulancePayment(supabase!, {
        resourceType: "ambulance",
        action: "checkout",
        bookingId,
        quoteId: saved.data?.quote_id,
      })
    );
    try {
      const response = await open(checkout, "");
      await processAmbulancePayment(supabase!, {
        resourceType: "ambulance",
        action: "verify",
        bookingId,
        attemptId: checkout.attemptId,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      });
    } catch {
      await refresh();
      throw new Error(
        "Checkout closed or verification is pending. Refresh payment status before retrying."
      );
    }
  };
  return { saved, mutation, pay, refresh };
}
