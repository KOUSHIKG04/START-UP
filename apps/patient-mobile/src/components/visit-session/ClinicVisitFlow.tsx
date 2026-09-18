import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MapPin, QrCode } from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, Card, FadedScrollView } from "@startup/mobile-ui";
import type { Appointment } from "../../types/appointment";
import { QueueStatus } from "./QueueStatus";
import { ScheduleSummary } from "./ScheduleSummary";

export interface ClinicVisitFlowProps {
  appointment: Appointment;
  onComplete: () => void;
}

export function ClinicVisitFlow({ appointment, onComplete }: ClinicVisitFlowProps) {
  const [checkedIn, setCheckedIn] = useState(false);

  return (
    <FadedScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScheduleSummary appointment={appointment} />
      {checkedIn ? (
        <QueueStatus onComplete={onComplete} />
      ) : (
        <>
          <Card
            variant="plain"
            backgroundColor={colors.white}
            borderRadius={radius.md}
            borderWidth={0}
            borderColor="transparent"
            gap={12}
            padding={20}
            style={[styles.centeredCard, styles.flatCard, styles.noBorderCard]}
          >
            <View style={styles.qrSurface}>
              <QrCode color={colors.patient.text} size={112} strokeWidth={1.5} />
            </View>
            <Text style={styles.checkInCode}>BK12454OPY</Text>
            <Text style={styles.centeredDescription}>
              Show this check-in code at reception to mark your attendance.
            </Text>
          </Card>
          <Card
            variant="outlined"
            borderRadius={radius.md}
            borderWidth={1}
            borderColor="#E0E5EB"
            gap={12}
            padding={16}
            style={styles.flatCard}
          >
            <View style={styles.locationRow}>
              <MapPin color={colors.patient.primaryDark} size={21} />
              <View style={styles.flexCopy}>
                <Text style={styles.cardTitle}>{appointment.hospital}</Text>
                <Text style={styles.secondaryText}>{appointment.location}</Text>
              </View>
            </View>
            <Button label="I’ve checked in" onPress={() => setCheckedIn(true)} />
          </Card>
        </>
      )}
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
  flatCard: {
    elevation: 0,
    shadowOpacity: 0,
  },
  noBorderCard: {
    borderWidth: 0,
    borderColor: "transparent",
  },
  centeredCard: {
    alignItems: "center",
  },
  qrSurface: {
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  checkInCode: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
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
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  flexCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  secondaryText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
});
