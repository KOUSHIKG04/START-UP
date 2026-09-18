import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  House,
  Monitor,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, Card, FadedScrollView } from "@startup/mobile-ui";
import FeedbackBottomSheet from "../FeedbackBottomSheet";
import type { Appointment } from "../../types/appointment";
import type { CompletionActions } from "../../types/visit-session";

export interface CompletionViewProps extends CompletionActions {
  appointment: Appointment;
}

const experienceRatings = [
  { emoji: "😞", label: "Very poor" },
  { emoji: "😐", label: "Okay" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😊", label: "Great" },
  { emoji: "😍", label: "Excellent" },
] as const;

export function CompletionView({
  appointment,
  onGoHome,
  onViewMedicines,
  onViewPrescription,
}: CompletionViewProps) {
  const [rating, setRating] = useState<number>();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const isClinic = appointment.consultationType === "Clinic Visit";
  const isHome = appointment.consultationType === "Home Visit";
  const completionCopy = isClinic
    ? "Your Clinic Visit is Completed"
    : isHome
      ? "Your Home Visit is Completed"
      : "Your online consultation is Completed";
  const HeroIcon = isClinic ? Stethoscope : isHome ? House : Monitor;

  return (
    <FadedScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.completionHero}>
        <View style={styles.completionHaloOuter}>
          <View style={styles.completionHaloInner}>
            <View style={styles.completionIcon}>
              <HeroIcon color={colors.white} size={50} strokeWidth={1.8} />
            </View>
            <View style={styles.completionCheckBadge}>
              <CheckCircle2 color={colors.white} size={32} strokeWidth={2.5} />
            </View>
          </View>
        </View>
        <Text style={styles.thankYouTitle}>Thank you!</Text>
        <Text style={styles.completedTitle}>{completionCopy}</Text>
        <Text style={styles.centeredDescription}>
          {appointment.doctorName} has completed your consultation.
        </Text>
      </View>

      {!isClinic ? <ConsultationSummary appointment={appointment} /> : null}

      {isClinic ? (
        <View style={styles.clinicOrderSection}>
          {/* <View style={styles.wellnessBanner}>
            <View style={styles.wellnessIcon}>
              <ShieldCheck color={colors.white} size={20} />
            </View>
            <Text style={styles.infoText}>
              We hope you are feeling better.{"\n"}Take care and stay healthy!
            </Text>
          </View> */}

          <View style={styles.completionActionsRow}>
            <Button
              label="Order Medicine"
              disabled
              onPress={onViewMedicines}
              style={styles.completionSecondaryAction}
              variant="secondary"
            />
            <Button
              label="View Prescription"
              onPress={onViewPrescription}
              style={styles.completionSecondaryAction}
              variant="secondary"
            />
          </View>
          <View style={styles.orderMedicineNotice}>
            <AlertCircle color={colors.patient.primary} size={16} strokeWidth={2} />
            <Text style={styles.orderMedicineNoticeText}>
              Order medicine will work once we start operations.
            </Text>
          </View>
        </View>
      ) : isHome ? (
        <View style={styles.wellnessBanner}>
          {/* <View style={styles.wellnessIcon}>
            <ShieldCheck color={colors.white} size={20} />
          </View>
          <Text style={styles.infoText}>
            We hope you are feeling better.{"\n"}Take care and stay healthy!
          </Text> */}
        </View>
      ) : (
        <View style={styles.recordsBanner}>
          <FileText color={colors.patient.primaryDark} size={23} />
          <Text style={styles.infoText}>
            Prescription and consultation notes have been sent to your email and are available in records.
          </Text>
        </View>
      )}

      <Card
        variant="outlined"
        borderRadius={radius.md}
        borderWidth={1}
        borderColor="#E0E5EB"
        gap={12}
        padding={16}
        style={styles.experienceCard}
      >
        <Text style={styles.feedbackTitle}>How was your experience?</Text>
        <Text style={styles.feedbackDescription}>
          Your feedback helps us improve
        </Text>
        <View style={styles.ratingRow}>
          {experienceRatings.map((item, index) => (
            <Pressable
              key={item.label}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: rating === index }}
              onPress={() => setRating(index)}
              style={({ pressed }) => [
                styles.ratingButton,
                rating === index ? styles.selectedRating : undefined,
                pressed ? styles.pressed : undefined,
              ]}
            >
              <Text style={styles.ratingEmoji}>{item.emoji}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <View style={styles.completionActionsRow}>
        <Button
          label="Go to Home"
          onPress={onGoHome}
          style={styles.completionSideButton}
          labelStyle={styles.completionSideButtonLabel}
        />
        <Button
          label="Share Detailed Feedback"
          onPress={() => setFeedbackOpen(true)}
          style={styles.completionSideButton}
          labelStyle={styles.completionSideButtonLabel}
          variant="outline"
        />
      </View>
      <FeedbackBottomSheet
        visible={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </FadedScrollView>
  );
}

function ConsultationSummary({ appointment }: { appointment: Appointment }) {
  return (
    <Card borderRadius={radius.md} gap={0} padding={0}>
      <View style={styles.summaryHeading}>
        <ClipboardList color={colors.patient.primaryDark} size={20} />
        <Text style={styles.cardTitle}>Consultation Summary</Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryLabel}>
          <UserRound color={colors.patient.primaryDark} size={18} />
          <Text style={styles.secondaryText}>Doctor</Text>
        </View>
        <Text style={styles.summaryValue}>{appointment.doctorName}</Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryLabel}>
          <CalendarDays color={colors.patient.primaryDark} size={18} />
          <Text style={styles.secondaryText}>Date & Time</Text>
        </View>
        <Text style={styles.summaryValue}>
          {appointment.date}, {appointment.time.split(" – ")[0]}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 126,
  },
  completionHero: {
    alignItems: "center",
    gap: 7,
    paddingTop: 10,
    paddingBottom: 4,
  },
  completionHaloOuter: {
    width: 178,
    height: 178,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderRadius: 89,
    backgroundColor: "#E1F7F4",
  },
  completionHaloInner: {
    width: 142,
    height: 142,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 71,
    backgroundColor: "#C8EDE9",
  },
  completionCheckBadge: {
    position: "absolute",
    top: 2,
    right: 0,
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.white,
    borderRadius: 23,
    backgroundColor: colors.patient.accent,
  },
  completionIcon: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 52,
    backgroundColor: colors.patient.primaryDark,
  },
  thankYouTitle: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    fontWeight: "700",
  },
  completedTitle: {
    color: colors.patient.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    fontWeight: "600",
  },
  centeredDescription: {
    maxWidth: 250,
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  clinicOrderSection: {
    width: "100%",
    gap: 12,
  },
  wellnessBanner: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.patient.surface,
  },
  wellnessIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.patient.primaryDark,
  },
  infoText: {
    flex: 1,
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  completionActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  completionSecondaryAction: { flex: 1, minHeight: 48 },
  orderMedicineNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    paddingVertical: 2,
  },
  orderMedicineNoticeText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  recordsBanner: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: "#E8F8F4",
  },
  experienceCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E0E5EB",
    borderRadius: radius.md,
    elevation: 0,
    shadowOpacity: 0,
  },
  feedbackTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  feedbackDescription: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    textAlign: "center",
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  ratingButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 24,
    backgroundColor: colors.white,
  },
  selectedRating: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: "#E8F8F4",
  },
  ratingEmoji: { fontSize: 27, lineHeight: 34 },
  pressed: { opacity: 0.72 },
  completionSideButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 8,
  },
  completionSideButtonLabel: {
    fontSize: 13,
  },
  summaryHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 14,
  },
  cardTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  summaryRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderDefault,
  },
  summaryLabel: { flexDirection: "row", alignItems: "center", gap: 10 },
  secondaryText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  summaryValue: {
    maxWidth: "62%",
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    textAlign: "right",
  },
});
