import { AppText as Text } from "@startup/mobile-ui";
import { View } from "react-native";
import { formatDisplayDate } from "@startup/contracts";
import { colors, radius } from "@startup/design-tokens";
import { Button, Card, Input, Loader } from "@startup/mobile-ui";
import type { BookSlotsProps } from "../types/doctor-profile";
import { formatConsultationFee } from "../utils/doctorDisplay";
import { useBookSlots } from "../hooks/useBookSlots";
import { styles } from "./BookSlots.styles";
import { BookingDateSection } from "./BookingDateSection";
import { BookingTimeSection } from "./BookingTimeSection";
import { BookingPatientSection } from "./BookingPatientSection";

export function BookSlots({
  address,
  consultationType,
  onBookAppointment,
  onGoToAbout,
  slots,
  patientOptions,
  loading,
  error,
  busy,
  openingConfirmation,
  timeZone,
  homeLocationReady,
}: BookSlotsProps) {
  const {
    selectedTime,
    setSelectedTime,
    reason,
    setReason,
    patientId,
    setPatientId,
    selectedPatientIsVerified,
    today,
    selectedMonthOffset,
    selectedDate,
    monthOptions,
    monthDates,
    dateSlots,
    selectedSlot,
    datesScrollRef,
    monthsScrollRef,
    handleSelectMonth,
    handleSelectDate,
  } = useBookSlots({
    address,
    consultationType,
    onBookAppointment,
    onGoToAbout,
    slots,
    patientOptions,
    loading,
    error,
    busy,
    openingConfirmation,
    timeZone,
  });
  return (
    <View style={styles.container}>
      <Card
        variant="outlined"
        borderRadius={radius.md}
        backgroundColor={colors.white}
        gap={20}
        padding={16}
        style={styles.bookSlotsCard}
      >
        <BookingDateSection
          today={today}
          selectedMonthOffset={selectedMonthOffset}
          selectedDate={selectedDate}
          monthOptions={monthOptions}
          monthDates={monthDates}
          datesScrollRef={datesScrollRef}
          monthsScrollRef={monthsScrollRef}
          handleSelectMonth={handleSelectMonth}
          handleSelectDate={handleSelectDate}
        />

        <BookingTimeSection
          selectedTime={selectedTime}
          setSelectedTime={setSelectedTime}
          selectedDate={selectedDate}
          dateSlots={dateSlots}
          loading={loading}
          error={error}
          timeZone={timeZone}
        />

        <BookingPatientSection
          patientId={patientId}
          setPatientId={setPatientId}
          patientOptions={patientOptions}
        />

        <View style={styles.bookingSection}>
          <Text variant="sectionHeading" style={styles.sectionTitle}>
            Reason for visit (optional)
          </Text>
          <Input
            accessibilityLabel="Reason for visit"
            placeholder="e.g. Fever, back pain, routine check-up..."
            value={reason}
            onChangeText={setReason}
            containerStyle={styles.reasonInputContainer}
          />
        </View>
        {loading ? <Loader theme="patient" style={styles.loading} /> : null}
      </Card>

      {selectedSlot ? (
        <Text variant="bodyEmphasis">
          Consultation fee:{" "}
          {formatConsultationFee(selectedSlot.fee_minor, selectedSlot.currency)}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          label="About Doctor"
          variant="outline"
          theme="patient"
          disabled={busy}
          onPress={onGoToAbout}
          style={styles.actionButton}
          labelStyle={styles.actionLabel}
          // leftIcon={
          //   <ChevronLeft
          //     color={colors.patient.primaryDark}
          //     size={15}
          //     strokeWidth={2.4}
          //   />
          // }
        />
        <Button
          loading={openingConfirmation}
          label="Book Appointment"
          theme="patient"
          variant="primary"
          disabled={
            busy ||
            !selectedSlot ||
            !selectedPatientIsVerified ||
            (consultationType === "Home Visit" && !homeLocationReady)
          }
          onPress={() => {
            if (busy || !selectedSlot) return;
            onBookAppointment({
              date: formatDisplayDate(selectedSlot.starts_at),
              time: selectedSlot.window_id,
              patient:
                patientOptions.find((option) => option.id === patientId)
                  ?.label ?? "Self",
              patientId,
              reason,
              consultationType,
              address,
            });
          }}
          style={styles.actionButton}
          labelStyle={styles.actionLabel}
        />
      </View>
    </View>
  );
}
