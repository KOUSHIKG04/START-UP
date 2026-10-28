import type { Props } from "../types/booking-confirmation-dialog";

export type { Props } from "../types/booking-confirmation-dialog";

import { AppText as Text } from "@startup/mobile-ui";
import { ScrollView, View, useWindowDimensions } from "react-native";
import {
  Button,
  Checkbox,
  Loader,
  ModalSurface,
  PaymentDisclosure,
} from "@startup/mobile-ui";

import { styles } from "./DoctorProfile.styles";

export function BookingConfirmationDialog({
  confirmation,
  setOpeningConfirmation,
  setConfirmation,
  book,
  practiceId,
  serviceMode,
  slots,
  bookingOptions,
  acceptedPolicy,
  setAcceptedPolicy,
}: Props) {
  const { height } = useWindowDimensions();
  const options = bookingOptions.data;
  const paying = options?.requires_payment;
  return (
    <ModalSurface
      animationType="none"
      visible={Boolean(confirmation)}
      onShow={() => setOpeningConfirmation(false)}
      onClose={() => {
        if (!book.isPending) {
          setOpeningConfirmation(false);
          setConfirmation(null);
        }
      }}
    >
      {confirmation ? (
        <ScrollView
          style={{ maxHeight: Math.max(180, height - 160) }}
          contentContainerStyle={{ gap: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="sectionHeading">Confirm appointment</Text>
          <Text variant="bodyEmphasis">{confirmation.doctor}</Text>
          <Text variant="body">
            {confirmation.mode === "home"
              ? "Home visit"
              : confirmation.facility}
            {confirmation.mode === "online"
              ? " · Online consultation"
              : `\n${confirmation.address}`}
          </Text>
          <Text variant="body">
            {new Date(confirmation.startsAt).toLocaleString("en-IN", {
              timeZone: confirmation.timezone,
            })}
          </Text>
          <Text variant="bodyEmphasis">{confirmation.fee}</Text>
          {paying && options?.mode === "test" ? (
            <Text variant="label">Test payment</Text>
          ) : null}
          <Text variant="label" style={styles.message}>
            {paying
              ? `Your time is reserved for up to ${options?.hold_minutes ?? 10} minutes during checkout. Your appointment is confirmed after payment is verified.`
              : options?.auto_accept
                ? "Your appointment will be confirmed immediately."
                : "Send a request to the doctor. After acceptance, complete any required payment in Appointment Details."}
          </Text>
          {bookingOptions.isPending ? <Loader theme="patient" /> : null}
          {bookingOptions.isError ? (
            <Button
              label="Retry booking options"
              theme="patient"
              variant="outline"
              onPress={() => void bookingOptions.refetch()}
            />
          ) : null}
          {paying && options ? (
            <>
              <PaymentDisclosure title="Payment and refund terms">
                <Text variant="body">{options.policy_text}</Text>
              </PaymentDisclosure>
              <Checkbox
                theme="patient"
                label="I agree to these payment and refund terms"
                checked={acceptedPolicy === options.policy_version}
                onCheckedChange={(checked) =>
                  setAcceptedPolicy(checked ? options.policy_version : "")
                }
                disabled={book.isPending}
              />
            </>
          ) : null}
          {book.isError ? (
            <Text variant="label" accessibilityRole="alert">
              Booking could not be completed. Review availability and try again.
            </Text>
          ) : null}
          <View style={styles.confirmationActions}>
            <Button
              theme="patient"
              variant="primary"
              label={
                paying
                  ? "Pay & Book"
                  : options?.auto_accept
                    ? "Book appointment"
                    : "Request appointment"
              }
              loading={book.isPending}
              disabled={
                book.isPending ||
                !options ||
                bookingOptions.isError ||
                (Boolean(paying) &&
                  acceptedPolicy !== options?.policy_version) ||
                confirmation.practiceId !== practiceId ||
                confirmation.mode !== serviceMode ||
                !slots.some((slot) => slot.window_id === confirmation.windowId)
              }
              onPress={() =>
                book.mutate({
                  patientId: confirmation.patientId,
                  windowId: confirmation.windowId,
                  reason: confirmation.reason,
                })
              }
              style={styles.confirmationButton}
              labelStyle={styles.confirmationButtonLabel}
            />
            <Button
              theme="patient"
              variant="outline"
              label="Cancel"
              disabled={book.isPending}
              onPress={() => {
                setOpeningConfirmation(false);
                setConfirmation(null);
              }}
              style={styles.confirmationButton}
              labelStyle={styles.confirmationButtonLabel}
            />
          </View>
        </ScrollView>
      ) : null}
    </ModalSurface>
  );
}
