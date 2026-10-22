import { ConsultationSummary } from "./ConsultationSummary";
import { styles } from "./CompletionView.styles";
import { useConsultationCompletion } from "../hooks/useConsultationCompletion";
import { experienceRatings } from "../utils/consultationConstants";
import type { CompletionViewProps } from "../types/visit-session";
export type { CompletionViewProps } from "../types/visit-session";
import { AppText as Text } from "@startup/mobile-ui";

import { Pressable, View } from "react-native";

import { AlertCircle, CheckCircle2, FileText } from "lucide-react-native";
import { colors, radius } from "@startup/design-tokens";
import { Button, Card, FadedScrollView } from "@startup/mobile-ui";
import FeedbackBottomSheet from "./FeedbackBottomSheet";

export function CompletionView({
  appointment,
  onGoHome,
  onViewMedicines,
  onViewPrescription,
  existingRating,
  onSubmitRating,
}: CompletionViewProps) {
  const {
    insets,
    rating,
    setRating,
    ratingSubmitted,
    submitting,
    feedbackOpen,
    setFeedbackOpen,
    submitRating,
    isClinic,
    isHome,
    completionCopy,
    HeroIcon,
  } = useConsultationCompletion({
    appointment,
    onGoHome,
    onViewMedicines,
    onViewPrescription,
    existingRating,
    onSubmitRating,
  });
  return (
    <FadedScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, 20) + 36 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topSection}>
        <View style={styles.completionHero}>
          <View style={styles.completionHaloOuter}>
            <View style={styles.completionHaloInner}>
              <View style={styles.completionIcon}>
                <HeroIcon color={colors.white} size={50} strokeWidth={1.8} />
              </View>
              <View style={styles.completionCheckBadge}>
                <CheckCircle2
                  color={colors.white}
                  size={32}
                  strokeWidth={2.5}
                />
              </View>
            </View>
          </View>
          <Text variant="cardHeading" style={styles.thankYouTitle}>
            Thank you!
          </Text>
          <Text variant="cardHeading" style={styles.completedTitle}>
            {completionCopy}
          </Text>
          <Text variant="body" style={styles.centeredDescription}>
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
              <AlertCircle
                color={colors.patient.primary}
                size={16}
                strokeWidth={2}
              />
              <Text variant="body" style={styles.orderMedicineNoticeText}>
                Order medicine will work once we start operations.
              </Text>
            </View>
          </View>
        ) : isHome ? null : (
          <View style={styles.recordsBanner}>
            <FileText color={colors.patient.primaryDark} size={23} />
            <Text variant="body" style={styles.infoText}>
              Prescription and consultation notes have been sent to your email
              and are available in records.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomSection}>
        {onSubmitRating ? (
          <Card
            variant="outlined"
            backgroundColor="#E8F8F4"
            borderRadius={radius.md}
            gap={12}
            padding={16}
            style={styles.experienceCard}
          >
            <Text variant="cardHeading" style={styles.feedbackTitle}>
              Rate your doctor
            </Text>
            {/* <Text style={styles.feedbackDescription}>
            Your feedback helps us improve
          </Text> */}
            <View style={styles.ratingRow}>
              {experienceRatings.map((item, index) => (
                <Pressable
                  key={item.label}
                  accessibilityLabel={`${index + 1} out of 5, ${item.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: rating === index + 1 }}
                  disabled={ratingSubmitted || submitting}
                  onPress={() => setRating(index + 1)}
                  style={({ pressed }) => [
                    styles.ratingButton,
                    rating === index + 1 ? styles.selectedRating : undefined,
                    pressed ? styles.pressed : undefined,
                  ]}
                >
                  <item.icon
                    size={27}
                    color={colors.patient.primaryDark}
                    accessible={false}
                  />
                </Pressable>
              ))}
            </View>

            {!ratingSubmitted ? (
              <Button
                loading={submitting}
                label="Submit"
                variant="outline"
                disabled={rating === undefined || submitting}
                onPress={() => void submitRating().catch(() => {})}
                style={[
                  styles.experienceSubmitButton,
                  rating !== undefined && styles.experienceSubmitButtonActive,
                ]}
                labelStyle={styles.experienceSubmitLabel}
              />
            ) : (
              <View style={styles.ratingSubmittedConfirmation}>
                <CheckCircle2
                  color={colors.patient.primaryDark}
                  size={16}
                  strokeWidth={2.4}
                />
                <Text variant="bodyEmphasis" style={styles.ratingSubmittedText}>
                  Rating saved. Thank you!
                </Text>
              </View>
            )}
          </Card>
        ) : null}

        <View style={styles.completionActionsRow}>
          <Button
            label="Go to Home"
            onPress={onGoHome}
            style={styles.completionSideButton}
            labelStyle={styles.completionSideButtonLabel}
          />
          {onSubmitRating && !ratingSubmitted ? (
            <Button
              label="Share Detailed Feedback"
              onPress={() => {
                if (rating !== undefined) setFeedbackOpen(true);
              }}
              disabled={rating === undefined || submitting}
              style={styles.completionSideButton}
              labelStyle={styles.completionSideButtonLabel}
              variant="outline"
            />
          ) : null}
        </View>
      </View>

      <FeedbackBottomSheet
        visible={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={submitRating}
      />
    </FadedScrollView>
  );
}
