import { useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
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
} from "../../types/appointment";
import { consultationFlows } from "../../utils/consultationFlow";
import type { BookingStatusScreenProps } from "../../types/booking-status";

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
        <View style={styles.mainContent}>
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
          ) : null}
        </View>

        <View style={styles.bottomSection}>
          {currentStatus === "approved" ? (
            isApprovedOnline ? (
              <OnlineConsultationActions
                onChatPress={() => onContinue("online-chat")}
                onJoinPress={() => onContinue("online-video")}
              />
            ) : (
              <View style={styles.actionsRow}>
                <Button
                  label="Cancel Appointment"
                  onPress={onBackPress}
                  variant="secondary"
                  style={styles.sideButton}
                  labelStyle={styles.sideButtonLabel}
                /> 
                <ApprovedStatus
                  label={flow.confirmationLabel}
                  style={styles.sideButton}
                  labelStyle={styles.sideButtonLabel}
                />
               
              </View>
            )
          ) : (
            <Button
              label="Cancel Appointment"
              onPress={onBackPress}
              variant="secondary"
              style={styles.cancelButton}
              labelStyle={styles.cancelLabel}
            />
          )}

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
        </View>
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
    <View style={styles.pendingCard}>
      <View style={styles.pendingHeader}>
        <View style={styles.pendingIconContainer}>
          <Clock3 color={colors.patient.primaryDark} size={20} strokeWidth={2.2} />
        </View>
        <View style={styles.statusCopy}>
          <View style={styles.pendingTitleRow}>
            <Text style={styles.pendingTitle}>Waiting for doctor’s approval</Text>
            {/* <View style={styles.pendingTag}>
              <View style={styles.pendingDot} />
              <Text style={styles.pendingTagText}>In Review</Text>
            </View> */}
          </View>
          <Text style={styles.pendingDescription}>
            We’ll notify you once your booking is confirmed by the doctor.
          </Text>
        </View>
      </View>
      <Button
        label="Preview approved booking"
        onPress={onPreviewApproval}
        variant="outline"
        theme="patient"
        style={styles.previewButton}
        labelStyle={styles.previewButtonLabel}
        leftIcon={
          <CheckCircle2
            color={colors.patient.primaryDark}
            size={16}
            strokeWidth={2}
          />
        }
      />
    </View>
  );
}

function ApprovedStatus({
  label,
  style,
  labelStyle,
}: {
  label: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Button
      label={label}
      variant="primary"
      theme="patient"
      style={[styles.approvedButton, style]}
      labelStyle={[styles.approvedButtonLabel, labelStyle]}
      rightIcon={
        <CheckCircle2 color={colors.white} size={16} strokeWidth={2.2} />
      }
    />
  );
}

function OnlineScheduleCard({ appointment }: { appointment: Appointment }) {
  return (
    <Card
      variant="outlined"
      borderRadius={radius.md}
      borderWidth={1}
      borderColor="#E0E5EB"
      gap={10}
      padding={16}
      style={styles.flatCard}
    >
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
    <Card
      variant="outlined"
      borderRadius={radius.md}
      borderWidth={1}
      borderColor="#E0E5EB"
      gap={10}
      padding={14}
      style={styles.flatCard}
    >
      <Text style={styles.paymentTitle}>Payment</Text>
      <View style={styles.paymentRow}>
        <Button
          label="Pay Now"
          theme="patient"
          leftIcon={
            <CreditCard
              color={payment === "now" ? colors.white : colors.patient.primaryDark}
              size={16}
            />
          }
          onPress={() => setPayment("now")}
          variant={payment === "now" ? "primary" : "outline"}
          style={styles.paymentButton}
          labelStyle={styles.paymentLabel}
        />
        <Button
          label="Pay Later"
          theme="patient"
          leftIcon={
            <Clock3
              color={payment === "later" ? colors.white : colors.patient.primaryDark}
              size={16}
            />
          }
          onPress={() => setPayment("later")}
          variant={payment === "later" ? "primary" : "outline"}
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
    color: colors.white,
    // fontFamily: fontFamilies.medium,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
  },
  content: {
    flexGrow: 1,
    gap: 14,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  mainContent: {
    gap: 14,
  },
  bottomSection: {
    gap: 14,
  },
  flatCard: {
    elevation: 0,
    shadowOpacity: 0,
  },
  pendingCard: {
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.patient.surface,
    borderWidth: 1,
    borderColor: colors.patient.surfaceBorder,
    gap: 14,
  },
  pendingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  pendingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.patient.surfaceBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCopy: {
    flex: 1,
    gap: 4,
  },
  pendingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  pendingTitle: {
    color: colors.patient.primary,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  pendingTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.patient.surfaceBorder,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F59E0B",
  },
  pendingTagText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    fontWeight: "600",
  },
  pendingDescription: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  previewButton: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.patient.surfaceBorder,
  },
  previewButtonLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: "600",
  },
  approvedButton: {
    minHeight: 52,
    borderRadius: radius.md,
  },
  approvedButtonLabel: {
    fontSize: 15,
  },
  cancelButton: {
    minHeight: 52,
    borderRadius: radius.md,
  },
  cancelLabel: { fontSize: 15 },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  sideButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 8,
  },
  sideButtonLabel: {
    fontSize: 13,
  },
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
