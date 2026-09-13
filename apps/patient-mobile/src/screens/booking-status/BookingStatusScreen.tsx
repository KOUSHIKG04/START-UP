import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, Clock3, CreditCard, Info } from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, Card, Header } from "@startup/mobile-ui";
import AppointmentDetailsCard from "../../components/AppointmentDetailsCard";
import DoctorCard from "../../components/DoctorCard";
import type { Appointment, AppointmentStatus } from "../../types/appointment";
import type { PatientScreenProps } from "../types";

type BookingStatusScreenProps = PatientScreenProps & {
  appointment: Appointment;
  status: AppointmentStatus;
};

export function BookingStatusScreen({
  appointment,
  status,
  onBackPress,
}: BookingStatusScreenProps) {
  return (
    <View style={styles.screen}>
      <Header
        title="Appointment Status"
        app="patient"
        onBackPress={onBackPress}
        titleStyle={styles.headerTitle}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DoctorCard
          name={appointment.doctorName}
          qualification={appointment.qualification}
          specialty={appointment.specialty}
          experience={appointment.experience}
          rating={appointment.rating}
          fee={appointment.fee}
          showChevron={false}
        />

        <AppointmentDetailsCard appointment={appointment} />

        {status === "pending" ? (
          <PendingStatus />
        ) : (
          <ApprovedStatus />
        )}

        <Button
          label="Cancel Appointment"
          variant="secondary"
          style={styles.cancelButton}
          labelStyle={styles.cancelLabel}
        />

        {status === "approved" ? <PaymentOptions /> : null}
      </ScrollView>
    </View>
  );
}

function PendingStatus() {
  return (
    <View style={styles.pendingBanner}>
      <Info color={colors.patient.primaryDark} size={21} strokeWidth={2} />
      <View style={styles.statusCopy}>
        <Text style={styles.pendingTitle}>Waiting for doctor’s approval</Text>
        <Text style={styles.pendingDescription}>
          We’ll notify you once your booking is approved.
        </Text>
      </View>
    </View>
  );
}

function ApprovedStatus() {
  return (
    <View style={styles.approvedBanner}>
      <Text style={styles.approvedTitle}>Booking confirmed</Text>
      <CheckCircle2 color={colors.white} size={21} strokeWidth={2.2} />
    </View>
  );
}

function PaymentOptions() {
  const [payment, setPayment] = useState<"now" | "later">("later");

  return (
    <Card borderRadius={radius.md} gap={10} padding={14}>
      <Text style={styles.paymentTitle}>Payment</Text>
      <View style={styles.paymentRow}>
        <Button
          label="Pay Now"
          leftIcon={<CreditCard color={colors.patient.primaryDark} size={16} />}
          onPress={() => setPayment("now")}
          variant={payment === "now" ? "secondary" : "outline"}
          style={styles.paymentButton}
          labelStyle={styles.paymentLabel}
        />
        <Button
          label="Pay Later"
          leftIcon={<Clock3 color={colors.patient.primaryDark} size={16} />}
          onPress={() => setPayment("later")}
          variant={payment === "later" ? "secondary" : "outline"}
          style={styles.paymentButton}
          labelStyle={styles.paymentLabel}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  content: {
    gap: 14,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 126,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: "#CCE9E6",
  },
  statusCopy: { flex: 1, gap: 2 },
  pendingTitle: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
  pendingDescription: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 15,
  },
  approvedBanner: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: radius.md,
    backgroundColor: colors.patient.primaryDark,
  },
  approvedTitle: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 23,
  },
  cancelButton: {
    minHeight: 52,
    borderRadius: radius.md,
  },
  cancelLabel: { fontSize: 15 },
  paymentTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: "700",
  },
  paymentRow: { flexDirection: "row", gap: 8 },
  paymentButton: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  paymentLabel: { fontSize: 12, lineHeight: 16 },
});
