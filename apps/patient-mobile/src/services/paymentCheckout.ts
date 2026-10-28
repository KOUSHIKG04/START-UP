import { Platform, NativeModules, TurboModuleRegistry } from "react-native";
import { colors } from "@startup/design-tokens";
import { appointmentCheckoutSchema } from "@startup/contracts";
import {
  processAppointmentPayment,
  releaseAppointmentBooking,
  type AppSupabaseClient,
} from "@startup/data-access";

export async function payForAppointment(
  client: AppSupabaseClient,
  input: {
    appointmentId: string;
    policyVersion: string;
    patientName: string;
    reservation?: boolean;
    openCheckout?: Awaited<ReturnType<typeof loadPaymentCheckout>>;
    onStageChange?: (
      stage: "preparing" | "checkout" | "verifying" | "reconciling"
    ) => void;
  }
) {
  const open = input.openCheckout ?? (await loadPaymentCheckout());
  let checkoutReturned = false;
  try {
    input.onStageChange?.("preparing");
    const checkout = appointmentCheckoutSchema.parse(
      await processAppointmentPayment(client, {
        action: "checkout",
        appointmentId: input.appointmentId,
        policyVersion: input.policyVersion,
      })
    );
    input.onStageChange?.("checkout");
    const result = await open(checkout, input.patientName);
    checkoutReturned = true;
    input.onStageChange?.("verifying");
    return await processAppointmentPayment(client, {
      action: "verify",
      appointmentId: input.appointmentId,
      attemptId: checkout.attemptId,
      paymentId: result.razorpay_payment_id,
      signature: result.razorpay_signature,
    });
  } catch (error) {
    input.onStageChange?.("reconciling");
    const refreshed = await processAppointmentPayment(client, {
      action: "reconcile",
      appointmentId: input.appointmentId,
    }).catch(() => null);
    if (
      !checkoutReturned &&
      input.reservation &&
      refreshed &&
      "captured_minor" in refreshed &&
      refreshed.captured_minor === 0 &&
      !refreshed.attempts.some((attempt) =>
        ["authorized", "creating", "uncertain"].includes(attempt.status)
      )
    ) {
      await releaseAppointmentBooking(client, input.appointmentId).catch(
        () => undefined
      );
    }
    if (error instanceof Error) throw error;
    throw new Error(
      "Payment was not completed. Check the booking's payment status before retrying."
    );
  }
}

export async function loadPaymentCheckout(
  service: "consultation" | "ambulance" = "consultation"
) {
  if (Platform.OS === "web")
    throw new Error(
      service === "ambulance"
        ? "Online checkout is available in the Android or iOS app. Contact the ambulance operator to arrange payment."
        : "Online checkout is available in the Android or iOS app. Open the mobile app to complete your booking payment."
    );
  if (
    !NativeModules.RNRazorpayCheckout &&
    !TurboModuleRegistry.get("RNRazorpayCheckout")
  )
    throw new Error(
      "Update the development app to use online payments. This build does not include the payment module yet."
    );
  const { default: RazorpayCheckout } = await import("react-native-razorpay");
  return (input: unknown, patientName: string) => {
    const options = appointmentCheckoutSchema.parse(input);
    return RazorpayCheckout.open({
      key: options.keyId,
      order_id: options.orderId,
      amount: options.amount,
      currency: options.currency,
      name: service === "consultation" ? "Consultation" : "Ambulance service",
      description:
        service === "consultation"
          ? "Appointment consultation fee"
          : "Completed ambulance trip fare",
      prefill: { name: patientName },
      theme: { color: colors.patient.primary },
      retry: { enabled: true, max_count: 4 },
    });
  };
}
