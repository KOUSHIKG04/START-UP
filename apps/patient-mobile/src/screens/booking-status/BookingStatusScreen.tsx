import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Info,
  MessageCircle,
  Video,
} from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, Card, FadedScrollView, Header } from "@startup/mobile-ui";
import AppointmentDetailsCard from "../../components/AppointmentDetailsCard";
import DoctorCard from "../../components/DoctorCard";
import type {
  Appointment,
  AppointmentStatus,
  VisitSessionMode,
} from "../../types/appointment";
import { consultationFlows } from "../../utils/consultationFlow";
import type { PatientScreenProps } from "../types";

type BookingStatusScreenProps = PatientScreenProps & {
  appointment: Appointment;
  status: AppointmentStatus;
  onContinue: (mode: VisitSessionMode) => void;
};

export function BookingStatusScreen({
  appointment,
  status,
  onBackPress,
  onContinue,
}: BookingStatusScreenProps) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const flow = consultationFlows[appointment.consultationType];
  const isApprovedOnline =
    currentStatus === "approved" && appointment.consultationType === "Online";

  return (
    <View style={styles.screen}>
      <Header
        title="Appointment Status"
        app="patient"
        onBackPress={onBackPress}
        titleStyle={styles.headerTitle}
      />
      <FadedScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isApprovedOnline ? (
          <OnlineScheduleCard appointment={appointment} />
        ) : (
          <DoctorCard
            name={appointment.doctorName}
            qualification={appointment.qualification}
            specialty={appointment.specialty}
            experience={appointment.experience}
            rating={appointment.rating}
            fee={appointment.fee}
            contextLabel={flow.profileContext}
            showChevron={false}
          />
        )}

        <AppointmentDetailsCard appointment={appointment} />

        {currentStatus === "pending" ? (
          <PendingStatus onPreviewApproval={() => setCurrentStatus("approved")} />
        ) : isApprovedOnline ? (
          <OnlineConsultationActions
            onChatPress={() => onContinue("online-chat")}
            onJoinPress={() => onContinue("online-video")}
          />
        ) : (
          <ApprovedStatus label={flow.confirmationLabel} />
        )}

        {!isApprovedOnline ? (
          <Button
            label="Cancel Appointment"
            onPress={onBackPress}
            variant="secondary"
            style={styles.cancelButton}
            labelStyle={styles.cancelLabel}
          />
        ) : null}

        {currentStatus === "approved" && flow.showsPayment ? (
          <PaymentOptions />
        ) : null}

        {currentStatus === "approved" &&
        appointment.consultationType !== "Online" ? (
          <Button
            label={
              appointment.consultationType === "Home Visit"
                ? "Track doctor visit"
                : "View hospital check-in"
            }
            onPress={() =>
              onContinue(
                appointment.consultationType === "Home Visit"
                  ? "home-tracking"
                  : "clinic-check-in"
              )
            }
            style={styles.continueButton}
          />
        ) : null}
      </FadedScrollView>
    </View>
  );
}

function PendingStatus({
  onPreviewApproval,
}: {
  onPreviewApproval: () => void;
}) {
  return (
    <View style={styles.pendingGroup}>
      <View style={styles.pendingBanner}>
        <Info color={colors.patient.primaryDark} size={21} strokeWidth={2} />
        <View style={styles.statusCopy}>
          <Text style={styles.pendingTitle}>Waiting for doctor’s approval</Text>
          <Text style={styles.pendingDescription}>
            We’ll notify you once your booking is approved.
          </Text>
        </View>
      </View>
      <Button
        label="Preview approved booking"
        onPress={onPreviewApproval}
        variant="outline"
      />
    </View>
  );
}

function ApprovedStatus({ label }: { label: string }) {
  return (
    <View style={styles.approvedBanner}>
      <Text style={styles.approvedTitle}>{label}</Text>
      <CheckCircle2 color={colors.white} size={21} strokeWidth={2.2} />
    </View>
  );
}

function OnlineScheduleCard({ appointment }: { appointment: Appointment }) {
  return (
    <Card borderRadius={radius.md} gap={10} padding={16}>
      <Text style={styles.onlineDoctorName}>{appointment.doctorName}</Text>
      <View style={styles.scheduleRow}>
        <Clock3 color={colors.patient.primaryDark} size={18} />
        <Text style={styles.scheduleLabel}>Time</Text>
        <Text style={styles.scheduleValue}>{appointment.time}</Text>
      </View>
      <View style={styles.scheduleRow}>
        <CalendarDays color={colors.patient.primaryDark} size={18} />
        <Text style={styles.scheduleLabel}>Date</Text>
        <Text style={styles.scheduleValue}>{appointment.date}</Text>
      </View>
    </Card>
  );
}

function OnlineConsultationActions({
  onChatPress,
  onJoinPress,
}: {
  onChatPress: () => void;
  onJoinPress: () => void;
}) {
  return (
    <View style={styles.videoBanner}>
      <View style={styles.videoIcon}>
        <Video color={colors.patient.primaryDark} size={19} strokeWidth={2} />
      </View>
      <Text style={styles.videoTitle}>Video consultation</Text>
      <Pressable
        accessibilityLabel="Open consultation chat"
        accessibilityRole="button"
        onPress={onChatPress}
        style={({ pressed }) => [
          styles.chatButton,
          pressed ? styles.pressed : undefined,
        ]}
      >
        <MessageCircle
          color={colors.patient.primaryDark}
          size={19}
          strokeWidth={2}
        />
      </Pressable>
      <Button
        label="Join"
        onPress={onJoinPress}
        style={styles.joinButton}
        labelStyle={styles.joinLabel}
      />
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
  pendingGroup: { gap: 10 },
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
    minHeight: 48,
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  paymentLabel: { fontSize: 12, lineHeight: 16 },
  continueButton: { minHeight: 48, borderRadius: radius.md },
  onlineDoctorName: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  scheduleRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  scheduleLabel: {
    flex: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
  },
  scheduleValue: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
  },
  videoBanner: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.patient.surface,
  },
  videoIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  videoTitle: {
    flex: 1,
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    fontWeight: "700",
  },
  chatButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.white,
  },
  joinButton: {
    minHeight: 48,
    paddingHorizontal: 17,
    borderRadius: 19,
  },
  joinLabel: { fontSize: 12, lineHeight: 16 },
  pressed: { opacity: 0.72 },
});
