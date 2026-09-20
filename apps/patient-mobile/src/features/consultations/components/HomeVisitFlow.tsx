import { StyleSheet, Text, View } from "react-native";
import { CarFront, Info } from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, Card, FadedScrollView } from "@startup/mobile-ui";
import AppointmentDetailsCard from "../../appointments/components/AppointmentDetailsCard";
import type { Appointment } from "../../appointments/types/appointment";
import { ScheduleSummary } from "./ScheduleSummary";

export interface HomeVisitFlowProps {
  appointment: Appointment;
  onComplete: () => void;
}

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
        borderWidth={1}
        borderColor="#E0E5EB"
        backgroundColor={colors.white}
        gap={16}
        padding={18}
        style={[styles.centeredCard, styles.flatCard]}
      >
        {/* <Text style={styles.cardTitle}>OTP verification</Text> */}
        <View style={styles.otpNotice}>
          <Info color={colors.patient.primaryDark} size={20} />
          <Text style={styles.infoText}>Share this OTP when the doctor arrives.</Text>
        </View>
        <View style={styles.otpRow}>
          {["4", "8", "2", "6"].map((digit, index) => (
            <View key={`${digit}-${index}`} style={styles.otpCell}>
              <Text style={styles.otpText}>{digit}</Text>
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
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.patient.surface,
    borderWidth: 1,
    borderColor: "#E0E5EB",
    elevation: 0,
    shadowOpacity: 0,
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
  flatCard: {
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: "#E0E5EB",
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
