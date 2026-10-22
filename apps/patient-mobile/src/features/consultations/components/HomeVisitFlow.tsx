import type { HomeVisitFlowProps } from "../types/visit-session";
export type { HomeVisitFlowProps } from "../types/visit-session";
import { AppText as Text } from "@startup/mobile-ui";
import { StyleSheet, View } from "react-native";
import { Info } from "lucide-react-native";
import {
  colors,
  fontFamilies,
  radius,
  spacing,
  surfaces,
} from "@startup/design-tokens";
import { Button, Card, FadedScrollView } from "@startup/mobile-ui";
import AppointmentDetailsCard from "../../appointments/components/AppointmentDetailsCard";

import { ScheduleSummary } from "./ScheduleSummary";

export function HomeVisitFlow({ appointment, onComplete }: HomeVisitFlowProps) {
  return (
    <FadedScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ScheduleSummary appointment={appointment} />
      {/* <View style={styles.trackingCard}>
        <View style={styles.trackingIconSurface}>
          <CarFront color={colors.white} size={22} strokeWidth={2} />
        </View>

        <View style={styles.trackingInfo}>
          <View style={styles.trackingHeaderRow}>
            <View style={styles.liveIndicator}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveLabel}>ON THE WAY</Text>
            </View>
          </View>
          <Text style={styles.trackingTitle}>Doctor is on the way</Text>
          <Text style={styles.trackingSubtitle}>
            Heading to your home • Please keep OTP ready
          </Text>
        </View>
      </View> */}
      <Card
        variant="outlined"
        borderRadius={radius.md}
        backgroundColor={colors.white}
        gap={16}
        padding={18}
        style={[styles.centeredCard, styles.cardSurface]}
      >
        {/* <Text style={styles.cardTitle}>OTP verification</Text> */}
        <View style={styles.otpNotice}>
          <Info color={colors.patient.primaryDark} size={20} />
          <Text variant="body" style={styles.infoText}>
            Share this OTP when the doctor arrives.
          </Text>
        </View>
        <View style={styles.otpRow}>
          {[
            { id: "otp-slot-1", digit: "4" },
            { id: "otp-slot-2", digit: "8" },
            { id: "otp-slot-3", digit: "2" },
            { id: "otp-slot-4", digit: "6" },
          ].map((slot) => (
            <View key={slot.id} style={styles.otpCell}>
              <Text variant="body" style={styles.otpText}>
                {slot.digit}
              </Text>
            </View>
          ))}
        </View>
        {/* <View style={styles.otpNotice}>
          <Info color={colors.patient.primaryDark} size={20} />
          <Text style={styles.infoText}>Share this OTP when the doctor arrives.</Text>
        </View> */}
      </Card>
      <AppointmentDetailsCard appointment={appointment} />
      <Button label="Mark visit complete" onPress={onComplete} />
    </FadedScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 126,
  },
  trackingCard: {
    ...surfaces.card,
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.patient.surface,
  },
  trackingIconSurface: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.patient.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  trackingInfo: {
    flex: 1,
    gap: 3,
  },
  trackingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 1,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
    backgroundColor: "#E6F7F5",
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  liveLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  trackingTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  trackingSubtitle: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  cardSurface: {
    ...surfaces.card,
    borderRadius: radius.md,
  },
  centeredCard: {
    alignItems: "center",
  },
  cardTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  otpRow: {
    flexDirection: "row",
    gap: 12,
  },
  otpCell: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F4F8F7",
    borderWidth: 1,
    borderColor: "#E0E5EB",
  },
  otpText: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    fontWeight: "700",
  },
  otpNotice: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: radius.md,
    backgroundColor: colors.patient.surface,
  },
  infoText: {
    flex: 1,
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
});
