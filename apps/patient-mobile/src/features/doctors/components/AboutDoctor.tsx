import { StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Button, Card, CardSeparator, Chip } from "@startup/mobile-ui";
import type { AboutDoctorProps } from "../types/doctor-profile";
import { doctorLanguageName } from "../utils/doctorDisplay";

export function AboutDoctor({
  doctorName,
  bio,
  facilityName,
  facilityAddress,
  distanceMeters,
  languages,
  onBack,
  onGoToSlots,
}: AboutDoctorProps) {
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
            {bio || `${doctorName} has not added a biography yet.`}
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
                <Text style={styles.hospitalName}>{facilityName}, </Text>
                <Text style={styles.hospitalAddress}>{facilityAddress}</Text>
              </Text>
              {distanceMeters !== null ? (
                <Text style={styles.secondaryText}>
                  {(distanceMeters / 1000).toFixed(1)} km from you
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <CardSeparator color="#E8ECEF" />

        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>Languages</Text>
          <View style={styles.languageRow}>
            {languages.map((language) => (
              <Chip
                key={language}
                label={doctorLanguageName(language)}
                style={styles.languageChip}
              />
            ))}
          </View>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          label="Back"
          variant="outline"
          theme="patient"
          onPress={onBack}
          style={styles.actionButton}
          labelStyle={styles.bookSlotsLabel}
        />
        <Button
          label="Book Slots"
          variant="primary"
          theme="patient"
          onPress={onGoToSlots}
          style={styles.actionButton}
          labelStyle={styles.bookSlotsLabel}
        />
      </View>
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
  actions: { flexDirection: "row", gap: 10 },
  actionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: 8,
  },
  bookSlotsLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
  },
});
