import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import {
  Download,
  FileText,
  Heart,
  Info,
  Pill,
  Share2,
  UserRound,
} from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import {
  Button,
  Card,
  Chip,
  FadedScrollView,
  Header,
} from "@startup/mobile-ui";
import type { Appointment } from "@/types/appointment";
import { prescriptionMedicines } from "@/features/prescriptions/data/mockPrescription";
import type { PatientScreenProps } from "@/types/screen";

type PrescriptionScreenProps = PatientScreenProps & {
  appointment: Appointment;
  onViewMedicines: () => void;
};

export function PrescriptionScreen({
  appointment,
  onBackPress,
  onViewMedicines,
}: PrescriptionScreenProps) {
  const [saved, setSaved] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const sharePrescription = () =>
    Share.share({
      message: `Prescription ${appointment.id} from ${appointment.doctorName}, issued ${appointment.date}.`,
    });

  return (
    <View style={styles.screen}>
      <Header app="patient" onBackPress={onBackPress} title="Prescription" />
      <FadedScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.doctorRow}>
          <View style={styles.avatar}>
            <UserRound color={colors.patient.primaryDark} size={27} />
          </View>
          <View style={styles.doctorCopy}>
            <Text style={styles.doctorName}>{appointment.doctorName} ✓</Text>
            <Text style={styles.specialty}>{appointment.specialty}</Text>
            <Text style={styles.qualification}>
              {appointment.qualification}
            </Text>
            <Text style={styles.rating}>
              ★ {appointment.rating} · {appointment.experience}
            </Text>
          </View>
          <Button
            accessibilityLabel={saved ? "Remove saved doctor" : "Save doctor"}
            label=""
            leftIcon={
              <Heart
                color={colors.white}
                fill={saved ? colors.white : "transparent"}
                size={19}
              />
            }
            onPress={() => setSaved((current) => !current)}
            style={styles.favoriteButton}
          />
        </View>

        <Card
          borderRadius={radius.md}
          gap={10}
          orientation="horizontal"
          padding={14}
        >
          <FileText color={colors.patient.primary} size={23} />
          <View style={styles.flexCopy}>
            <Text style={styles.cardTitle}>Prescription #RX20260820</Text>
            <Text style={styles.secondaryText}>Issued {appointment.date}</Text>
          </View>
          <Chip
            label="Active"
            style={styles.activeChip}
            labelStyle={styles.activeChipText}
          />
        </Card>

        <Card
          accessibilityLabel="View medicine details"
          borderRadius={radius.md}
          gap={10}
          onPress={onViewMedicines}
          padding={15}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Medicines</Text>
            <Chip label="Viral fever" style={styles.diagnosisChip} />
          </View>
          {prescriptionMedicines.map((medicine) => (
            <View key={medicine.id} style={styles.medicineRow}>
              <View style={styles.medicineNumber}>
                <Text style={styles.medicineNumberText}>{medicine.id}</Text>
              </View>
              <View style={styles.flexCopy}>
                <Text style={styles.medicineName}>{medicine.name}</Text>
                <Text numberOfLines={1} style={styles.medicineDose}>
                  {medicine.dose}
                </Text>
              </View>
            </View>
          ))}
          <View style={styles.viewDetailsRow}>
            <Pill color={colors.patient.primaryDark} size={17} />
            <Text style={styles.viewDetailsText}>View medicine schedule</Text>
          </View>
        </Card>

        <View style={styles.adviceBanner}>
          <View style={styles.adviceIcon}>
            <Info color={colors.patient.primaryDark} size={18} />
          </View>
          <View style={styles.flexCopy}>
            <Text style={styles.adviceTitle}>
              Rest well, stay hydrated, and avoid strenuous activity.
            </Text>
            <Text style={styles.secondaryText}>
              Follow-up: 27 Aug 2026 · Contact clinic if symptoms worsen
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Button
            label={downloaded ? "Downloaded" : "Download PDF"}
            leftIcon={<Download color={colors.white} size={18} />}
            onPress={() => setDownloaded(true)}
            style={styles.downloadButton}
          />
          <Button
            label="Share"
            leftIcon={<Share2 color={colors.patient.primaryDark} size={17} />}
            onPress={sharePrescription}
            style={styles.shareButton}
            variant="outline"
          />
        </View>
      </FadedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: { gap: 14, padding: spacing.lg, paddingBottom: 126 },
  doctorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: "#C8EDE9",
  },
  doctorCopy: { flex: 1, gap: 2 },
  doctorName: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: "700",
  },
  specialty: {
    color: colors.patient.text,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  qualification: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  rating: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.regular,
    fontSize: 10,
  },
  favoriteButton: {
    width: 44,
    minHeight: 44,
    paddingHorizontal: 0,
    borderRadius: 22,
  },
  flexCopy: { flex: 1, minWidth: 0, gap: 2 },
  cardTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    lineHeight: 14,
  },
  activeChip: { borderWidth: 0, backgroundColor: "#E9F8F4" },
  activeChipText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
  },
  diagnosisChip: { borderWidth: 0, backgroundColor: "#EEF6F9" },
  medicineRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#F8FCFC",
  },
  medicineNumber: {
    width: 29,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.patient.primary,
  },
  medicineNumberText: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    fontWeight: "700",
  },
  medicineName: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
  },
  medicineDose: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 9,
  },
  viewDetailsRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  viewDetailsText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
  },
  adviceBanner: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: "#E8F8F4",
  },
  adviceIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  adviceTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  actionRow: { flexDirection: "row", gap: 10 },
  downloadButton: { flex: 1, minHeight: 50 },
  shareButton: { minWidth: 114, minHeight: 50 },
});
