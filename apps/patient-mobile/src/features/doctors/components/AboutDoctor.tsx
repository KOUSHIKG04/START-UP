import { StyleSheet, Text, View } from "react-native";
import { ChevronRight, MapPin } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Button, Card, CardSeparator, Chip } from "@startup/mobile-ui";
import { languages } from "../utils/doctorProfileConstants";
import type { AboutDoctorProps } from "../types/doctor-profile";

export function AboutDoctor({ doctorName, onGoToSlots }: AboutDoctorProps) {
  return (
    <View style={styles.container}>
      <Card
        variant="outlined"
        borderRadius={radius.md}
        borderColor="#E0E5EB"
        borderWidth={1}
        backgroundColor={colors.white}
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
      </Card>

      <Button
        label="Book Slots"
        variant="primary"
        theme="patient"
        onPress={onGoToSlots}
        style={styles.bookSlotsButton}
        labelStyle={styles.bookSlotsLabel}
        rightIcon={
          <ChevronRight
            color={colors.white}
            size={16}
            strokeWidth={2.4}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 14,
  },
  aboutCard: {
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: "#E0E5EB",
    borderRadius: radius.md,
    backgroundColor: colors.white,
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
  bookSlotsButton: {
    width: "100%",
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: radius.md,
  },
  bookSlotsLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
  },
});
