import { StyleSheet, Text, View } from "react-native";
import { Video } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Button, Card } from "@startup/mobile-ui";
import type { OnlineConsultationProps } from "../types/doctor-profile";

export function OnlineConsultation({
  fee,
  onBookPress,
}: OnlineConsultationProps) {
  return (
    <Card
      backgroundColor={colors.white}
      borderRadius={radius.md}
      borderWidth={1}
      borderColor="#E0E5EB"
      gap={14}
      orientation="horizontal"
      padding={14}
      variant="outlined"
      style={styles.consultationCard}
    >
      <View style={styles.consultationIconContainer}>
        <Video color={colors.patient.primary} size={22} strokeWidth={2.2} />
      </View>

      <View style={styles.consultationCopy}>
        <Text style={styles.consultationTitle}>
          Online Consultation Available
        </Text>
        <Text style={styles.consultationSubtitle}>
          {`Video call from home · ${fee}`}
        </Text>
      </View>

      <Button
        label="Book"
        theme="patient"
        onPress={onBookPress}
        style={styles.consultationButton}
        labelStyle={styles.consultationButtonLabel}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  consultationCard: {
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E0E5EB",
    elevation: 0,
    shadowOpacity: 0,
  },
  consultationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#E6F7F5",
    alignItems: "center",
    justifyContent: "center",
  },
  consultationCopy: {
    flex: 1,
    gap: 3,
  },
  consultationTitle: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
  },
  consultationSubtitle: {
    color: "#5B6B79",
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  consultationButton: {
    minHeight: 40,
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.patient.primary,
  },
  consultationButtonLabel: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
});
