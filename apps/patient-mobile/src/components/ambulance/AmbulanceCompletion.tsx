import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Ambulance,
  Building2,
  CheckCircle2,
  ClipboardList,
  ReceiptText,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, Card } from "@startup/mobile-ui";
import { ambulanceTrip } from "../../utils/ambulanceConstants";

const experienceRatings = [
  { emoji: "😞", label: "Very poor" },
  { emoji: "😐", label: "Okay" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😊", label: "Great" },
  { emoji: "😍", label: "Excellent" },
] as const;

export function AmbulanceCompletion({
  onGoHome,
}: {
  onGoHome: () => void;
}) {
  const [rating, setRating] = useState<number>();
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const ratingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (ratingTimerRef.current) clearTimeout(ratingTimerRef.current);
    };
  }, []);

  const handleRatingSubmit = () => {
    if (rating === undefined || ratingSubmitted) return;
    setRatingSubmitted(true);
    ratingTimerRef.current = setTimeout(() => {
      onGoHome();
    }, 2000);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topSection}>
        {/* Completion Hero matching CompletionView */}
        <View style={styles.completionHero}>
          <View style={styles.completionHaloOuter}>
            <View style={styles.completionHaloInner}>
              <View style={styles.completionIcon}>
                <Ambulance color={colors.white} size={50} strokeWidth={1.8} />
              </View>
              <View style={styles.completionCheckBadge}>
                <CheckCircle2 color={colors.white} size={32} strokeWidth={2.5} />
              </View>
            </View>
          </View>
          <Text style={styles.thankYouTitle}>Thank you!</Text>
          <Text style={styles.completedTitle}>
            Your Ambulance Journey is Completed
          </Text>
          <Text style={styles.centeredDescription}>
            Patient safely handed over to {ambulanceTrip.dropoff.split(",")[0]}{" "}
            emergency care team.
          </Text>
        </View>

        {/* Handover Summary Card */}
        <Card
          variant="outlined"
          borderRadius={radius.md}
          borderWidth={1}
          borderColor="#E0E5EB"
          backgroundColor={colors.white}
          gap={0}
          padding={0}
          style={styles.summaryCard}
        >
          <View style={styles.summaryHeading}>
            <ClipboardList color={colors.patient.primaryDark} size={20} />
            <Text style={styles.cardTitle}>Emergency Handover Summary</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryLabel}>
              <Building2 color={colors.patient.primaryDark} size={18} />
              <Text style={styles.secondaryText}>Hospital</Text>
            </View>
            <Text style={styles.summaryValue}>{ambulanceTrip.dropoff}</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryLabel}>
              <UserRound color={colors.patient.primaryDark} size={18} />
              <Text style={styles.secondaryText}>Paramedic</Text>
            </View>
            <Text style={styles.summaryValue}>
              {ambulanceTrip.driver} ({ambulanceTrip.vehicle})
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryLabel}>
              <ShieldCheck color={colors.patient.primaryDark} size={18} />
              <Text style={styles.secondaryText}>Service</Text>
            </View>
            <Text style={styles.summaryValue}>{ambulanceTrip.service}</Text>
          </View>

          <View style={styles.summaryRowLast}>
            <View style={styles.summaryLabel}>
              <ReceiptText color={colors.patient.primaryDark} size={18} />
              <Text style={styles.secondaryText}>Total Fare</Text>
            </View>
            <Text style={styles.summaryValueTotal}>₹{ambulanceTrip.fare} (Paid)</Text>
          </View>
        </Card>
      </View>

      <View style={styles.bottomSection}>
        {/* Experience Rating Card matching CompletionView */}
        <Card
          variant="outlined"
          backgroundColor="#E8F8F4"
          borderRadius={radius.md}
          borderWidth={1}
          borderColor="#E0E5EB"
          gap={12}
          padding={16}
          style={styles.experienceCard}
        >
          <Text style={styles.feedbackTitle}>How was your experience?</Text>
          <View style={styles.ratingRow}>
            {experienceRatings.map((item, index) => (
              <Pressable
                key={item.label}
                accessibilityLabel={item.label}
                accessibilityRole="button"
                accessibilityState={{ selected: rating === index }}
                disabled={ratingSubmitted}
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

          {!ratingSubmitted ? (
            <Button
              label="Submit"
              variant="outline"
              disabled={rating === undefined}
              onPress={handleRatingSubmit}
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
              <Text style={styles.ratingSubmittedText}>
                Submitted • Returning home...
              </Text>
            </View>
          )}
        </Card>

        {/* Go to Home Button */}
        <Button
          label="Go to Home"
          onPress={onGoHome}
          style={styles.goHomeButton}
          labelStyle={styles.goHomeButtonLabel}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 48,
  },
  topSection: {
    width: "100%",
    gap: 14,
  },
  bottomSection: {
    width: "100%",
    gap: 14,
    marginTop: "auto",
    paddingTop: 12,
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
    textAlign: "center",
  },
  centeredDescription: {
    maxWidth: 280,
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#E0E5EB",
    borderRadius: radius.md,
    backgroundColor: colors.white,
    overflow: "hidden",
    elevation: 0,
    shadowOpacity: 0,
  },
  summaryHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E5EB",
    backgroundColor: "#F8FAFC",
  },
  cardTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E5EB",
  },
  summaryRowLast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  summaryValue: {
    flex: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    textAlign: "right",
  },
  summaryValueTotal: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    textAlign: "right",
  },
  experienceCard: {
    backgroundColor: "#E8F8F4",
    borderWidth: 1,
    borderColor: "#E0E5EB",
    borderRadius: radius.md,
    elevation: 0,
    shadowOpacity: 0,
  },
  feedbackTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    fontWeight: "600",
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
  ratingEmoji: {
    fontSize: 27,
    lineHeight: 34,
  },
  pressed: {
    opacity: 0.72,
  },
  experienceSubmitButton: {
    minHeight: 40,
    marginTop: 4,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderColor: "#D1D5DB",
    borderWidth: 1,
  },
  experienceSubmitButtonActive: {
    borderColor: colors.patient.primary,
  },
  experienceSubmitLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  ratingSubmittedConfirmation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  ratingSubmittedText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  goHomeButton: {
    minHeight: 52,
    borderRadius: radius.md,
    elevation: 0,
    shadowOpacity: 0,
  },
  goHomeButtonLabel: {
    fontSize: 15,
  },
});
