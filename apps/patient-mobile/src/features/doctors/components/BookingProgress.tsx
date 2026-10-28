import { StyleSheet, View } from "react-native";
import { AppText as Text, Loader } from "@startup/mobile-ui";
import { colors, fontFamilies } from "@startup/design-tokens";
import type { useDoctorBooking } from "../hooks/useDoctorBooking";

type BookingStage = NonNullable<
  ReturnType<typeof useDoctorBooking>["bookingStage"]
>;

const progressCopy: Record<BookingStage, { title: string; message: string }> = {
  booking: {
    title: "Booking your appointment",
    message: "Please wait while we reserve your selected time.",
  },
  preparing: {
    title: "Preparing secure payment",
    message: "Please wait. Razorpay will open shortly.",
  },
  checkout: {
    title: "Opening secure payment",
    message: "Complete your payment in Razorpay to continue.",
  },
  verifying: {
    title: "Verifying your payment",
    message: "We’re checking your payment before confirming the booking.",
  },
  reconciling: {
    title: "Checking payment status",
    message: "Please wait while we check the latest payment result.",
  },
  finishing: {
    title: "Finishing your booking",
    message: "We’re updating your appointment details.",
  },
};

/** Covers the page without placing another native Modal above Razorpay. */
export function BookingProgress({ stage }: { stage: BookingStage | null }) {
  if (!stage) return null;
  const copy = progressCopy[stage];
  return (
    <View
      testID="booking-progress"
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
      style={styles.screen}
    >
      <Loader theme="patient" size="large" />
      <View style={styles.copy}>
        <Text variant="inherit" style={styles.title}>
          {copy.title}
        </Text>
        <Text variant="inherit" style={styles.message}>
          {copy.message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    elevation: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingHorizontal: 32,
    backgroundColor: colors.patient.background,
  },
  copy: { gap: 8, maxWidth: 320 },
  title: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    lineHeight: 25,
    textAlign: "center",
  },
  message: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
