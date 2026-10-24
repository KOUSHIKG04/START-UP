import type { Props } from "../types/booking-confirmation-dialog";

export type { Props } from "../types/booking-confirmation-dialog";

import { AppText as Text } from "@startup/mobile-ui";
import { View } from "react-native";
import { Button, ModalSurface } from "@startup/mobile-ui";

import { styles } from "./DoctorProfile.styles";

export function BookingConfirmationDialog({
  confirmation,
  setOpeningConfirmation,
  setConfirmation,
  book,
  practiceId,
  serviceMode,
  slots,
}: Props) {
  return (
    <ModalSurface
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
        <>
          <Text variant="sectionHeading">Confirm appointment</Text>
          <Text variant="bodyEmphasis">{confirmation.doctor}</Text>
          <Text variant="body">
            {confirmation.facility}
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
          <Text variant="label" style={styles.message}>
            Your booking may be confirmed automatically or sent to the doctor
            for approval.
          </Text>
          {book.isError ? (
            <Text variant="label" accessibilityRole="alert">
              Booking could not be completed. Review availability and try again.
            </Text>
          ) : null}
          <View style={styles.confirmationActions}>
            <Button
              theme="patient"
              variant="primary"
              label="Confirm booking"
              loading={book.isPending}
              disabled={
                book.isPending ||
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
        </>
      ) : null}
    </ModalSurface>
  );
}
