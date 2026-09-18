import { StyleSheet, Text, View } from "react-native";
import { ChevronRight, MapPin } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Button, Card, CardSeparator, Chip } from "@startup/mobile-ui";
import { languages } from "../../utils/doctorProfileConstants";
import type { AboutDoctorProps } from "../../types/doctor-profile";

export function AboutDoctor({ doctorName, onGoToSlots }: AboutDoctorProps) {
  return (
    <Card
      variant="plain"
      borderRadius={radius.md}
      gap={16}
      padding={16}
      style={styles.aboutCard}
    >
      <View style={styles.aboutSection}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bodyText}>
          {doctorName} is an experienced General Physician focused on chronic
          conditions, infectious diseases, preventive care, and clear guidance
          for every patient.
        </Text>
      </View>

      <CardSeparator color="#E8ECEF" />

      <View style={styles.aboutSection}>
        <Text style={styles.sectionTitle}>Hospital</Text>
        <View style={styles.hospitalRow}>
          <MapPin
            color={colors.patient.primaryDark}
            size={18}
            strokeWidth={1.9}
          />
          <View style={styles.hospitalCopy}>
            <Text style={styles.hospitalLine}>
              <Text style={styles.hospitalName}>Apollo Hospitals, </Text>
              <Text style={styles.hospitalAddress}>near Koramangala, Bengaluru, 560064</Text>
            </Text>
            <Text style={styles.secondaryText}>1.2 km from you</Text>
          </View>
        </View>
      </View>

      <CardSeparator color="#E8ECEF" />

      <View style={styles.aboutSection}>
        <Text style={styles.sectionTitle}>Languages</Text>
        <View style={styles.languageRow}>
          {languages.map((language) => (
            <Chip key={language} label={language} style={styles.languageChip} />
          ))}
        </View>
      </View>

      <View style={styles.aboutFooterRow}>
        <Button
          label="Book Slots"
          variant="ghost"
          theme="patient"
          onPress={onGoToSlots}
          style={styles.goToSlotsButton}
          labelStyle={styles.goToSlotsLabel}
          rightIcon={
            <ChevronRight
              color={colors.patient.primaryDark}
              size={16}
              strokeWidth={2.4}
            />
          }
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  aboutCard: {
    flex: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  aboutSection: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  bodyText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 19,
  },
  hospitalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  hospitalCopy: {
    flex: 1,
    gap: 2,
  },
  hospitalLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
  },
  hospitalName: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  hospitalAddress: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  secondaryText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  languageChip: {
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  aboutFooterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 4,
  },
  goToSlotsButton: {
    minHeight: 34,
    paddingHorizontal: 0,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  goToSlotsLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: "600",
  },
});
