import { useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import {
  Download,
  FileText,
  Info,
  Pill,
  Share2,
} from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, Card, Chip, FadedScrollView, Header } from "@startup/mobile-ui";
import DoctorCard from "../../doctors/components/DoctorCard";
import type { Appointment } from "../../appointments/types/appointment";
import { prescriptionMedicines } from "../utils/prescription";
import type { PrescriptionScreenProps } from "../types/prescription";

export function PrescriptionScreen({
  appointment,
  onBackPress,
  onViewMedicines,
}: PrescriptionScreenProps) {
  const [downloaded, setDownloaded] = useState(false);

  const sharePrescription = () =>
    Share.share({
      message: `Prescription ${appointment.id} from ${appointment.doctorName}, issued ${appointment.date}.`,
    });

  return (
    <View style={styles.screen}>
      <Header app="patient" onBackPress={onBackPress} title="Prescription" />
      <FadedScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DoctorCard
          name={appointment.doctorName}
          qualification={appointment.qualification}
          specialty={appointment.specialty}
          experience={appointment.experience}
          rating={appointment.rating}
          fee={appointment.fee}
          hideFee
          hideExperience
        />

        <Card
          variant="outlined"
          borderRadius={radius.md}
          borderWidth={1}
          borderColor="#E0E5EB"
          gap={10}
          orientation="horizontal"
          padding={14}
          style={styles.noElevation}
        >
          <FileText color={colors.patient.primary} size={23} />
          <View style={styles.flexCopy}>
            <Text style={styles.cardTitle}>Prescription #RX20260820</Text>
            <Text style={styles.secondaryText}>Issued {appointment.date}</Text>
          </View>
          <Chip label="Active" style={styles.activeChip} labelStyle={styles.activeChipText} />
        </Card>

        <View style={styles.medicinesCard}>
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
                <Text numberOfLines={1} style={styles.medicineDose}>{medicine.dose}</Text>
              </View>
            </View>
          ))}
          <Pressable
            accessibilityLabel="View medicine schedule"
            accessibilityRole="button"
            onPress={onViewMedicines}
            style={({ pressed }) => [
              styles.viewDetailsRow,
              pressed ? styles.pressed : undefined,
            ]}
          >
            <Pill color={colors.patient.primaryDark} size={17} />
            <Text style={styles.viewDetailsText}>View medicine schedule</Text>
          </Pressable>
        </View>

        <View style={styles.adviceBanner}>
          <View style={styles.adviceIcon}>
            <Info color={colors.patient.primaryDark} size={18} />
          </View>
          <View style={styles.flexCopy}>
            <Text style={styles.adviceTitle}>Rest well, stay hydrated, and avoid strenuous activity.</Text>
            <Text style={styles.secondaryText}>Follow-up: 27 Aug 2026 · Contact clinic if symptoms worsen</Text>
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
  noElevation: { elevation: 0, shadowOpacity: 0 },
  medicinesCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E0E5EB",
    padding: 16,
    gap: 12,
    elevation: 0,
    shadowOpacity: 0,
  },
  flexCopy: { flex: 1, minWidth: 0, gap: 2 },
  cardTitle: { color: colors.patient.text, fontFamily: fontFamilies.bold, fontSize: 13, fontWeight: "700" },
  secondaryText: { color: colors.patient.textSecondary, fontFamily: fontFamilies.regular, fontSize: 10, lineHeight: 14 },
  activeChip: { borderWidth: 0, backgroundColor: "#E9F8F4" },
  activeChipText: { color: colors.patient.primaryDark, fontFamily: fontFamilies.semibold, fontSize: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.patient.text, fontFamily: fontFamilies.bold, fontSize: 15, fontWeight: "700" },
  diagnosisChip: { borderWidth: 0, backgroundColor: "#EEF6F9" },
  medicineRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 8, borderRadius: 10, backgroundColor: "#F8FCFC" },
  medicineNumber: { width: 29, height: 29, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: colors.patient.primary },
  medicineNumberText: { color: colors.white, fontFamily: fontFamilies.bold, fontSize: 11, fontWeight: "700" },
  medicineName: { color: colors.patient.text, fontFamily: fontFamilies.semibold, fontSize: 12, fontWeight: "600" },
  medicineDose: { color: colors.patient.textSecondary, fontFamily: fontFamilies.regular, fontSize: 9 },
  viewDetailsRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: "#E0E5EB",
    paddingTop: 8,
    marginTop: 2,
  },
  viewDetailsText: { color: colors.patient.primaryDark, fontFamily: fontFamilies.semibold, fontSize: 12, fontWeight: "600" },
  pressed: { opacity: 0.72 },
  adviceBanner: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 11, padding: 14, borderRadius: radius.md, backgroundColor: "#E8F8F4" },
  adviceIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.white },
  adviceTitle: { color: colors.patient.text, fontFamily: fontFamilies.semibold, fontSize: 11, fontWeight: "600", lineHeight: 15 },
  actionRow: { flexDirection: "row", gap: 10 },
  downloadButton: { flex: 1, minHeight: 50 },
  shareButton: { minWidth: 114, minHeight: 50 },
});
