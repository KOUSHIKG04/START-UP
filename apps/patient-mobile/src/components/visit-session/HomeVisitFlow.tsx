import { StyleSheet, Text, View } from "react-native";
import { CarFront, Info } from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, Card, FadedScrollView } from "@startup/mobile-ui";
import AppointmentDetailsCard from "../AppointmentDetailsCard";
import type { Appointment } from "../../types/appointment";
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
      <View style={styles.infoBanner}>
        <CarFront color={colors.patient.primaryDark} size={21} />
        <Text style={styles.infoText}>Doctor is on the way to your home</Text>
      </View>
      <Card borderRadius={radius.md} gap={16} padding={18} style={styles.centeredCard}>
        <Text style={styles.cardTitle}>OTP verification</Text>
        <View style={styles.otpRow}>
          {["4", "8", "2", "6"].map((digit, index) => (
            <View key={`${digit}-${index}`} style={styles.otpCell}>
              <Text style={styles.otpText}>{digit}</Text>
            </View>
          ))}
        </View>
        <View style={styles.otpNotice}>
          <Info color={colors.patient.primaryDark} size={20} />
          <Text style={styles.infoText}>Share this OTP when the doctor arrives.</Text>
        </View>
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
  infoBanner: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: "#CCE9E6",
  },
  infoText: {
    flex: 1,
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
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
    backgroundColor: colors.white,
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
});
