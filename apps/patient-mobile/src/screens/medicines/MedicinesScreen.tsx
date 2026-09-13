import { StyleSheet, Text, View } from "react-native";
import { Pill } from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Card, Chip, FadedScrollView, Header } from "@startup/mobile-ui";
import { prescriptionMedicines } from "../../utils/prescription";
import type { PatientScreenProps } from "../types";

export function MedicinesScreen({ onBackPress }: PatientScreenProps) {
  return (
    <View style={styles.screen}>
      <Header app="patient" onBackPress={onBackPress} title="Medicines" />
      <FadedScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.diagnosisRow}>
          <Text style={styles.diagnosisLabel}>CURRENT DIAGNOSIS</Text>
          <Chip label="Viral Fever" style={styles.diagnosisChip} labelStyle={styles.diagnosisValue} />
        </View>

        {prescriptionMedicines.map((medicine) => (
          <Card key={medicine.id} borderRadius={radius.md} gap={14} padding={15}>
            <View style={styles.medicineHeader}>
              <View style={styles.pillIcon}>
                <Pill color={colors.white} size={18} />
              </View>
              <Text style={styles.medicineName}>{medicine.name}</Text>
            </View>

            <View style={styles.scheduleRow}>
              <Dose label="Breakfast" value={medicine.schedule.breakfast} />
              <View style={styles.separator} />
              <Dose label="Lunch" value={medicine.schedule.lunch} />
              <View style={styles.separator} />
              <Dose label="Dinner" value={medicine.schedule.dinner} />
            </View>

            <Text style={styles.doseSummary}>{medicine.dose}</Text>
          </Card>
        ))}
      </FadedScrollView>
    </View>
  );
}

function Dose({ label, value }: { label: string; value: number }) {
  const active = value > 0;
  return (
    <View style={styles.doseColumn}>
      <Text style={styles.mealLabel}>{label}</Text>
      <View style={[styles.doseBox, active ? styles.activeDoseBox : undefined]}>
        <Text style={[styles.doseValue, active ? styles.activeDoseValue : undefined]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: { gap: 16, padding: spacing.lg, paddingBottom: 126 },
  diagnosisRow: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  diagnosisLabel: { color: colors.patient.textSecondary, fontFamily: fontFamilies.semibold, fontSize: 12, fontWeight: "600" },
  diagnosisChip: { borderWidth: 0, backgroundColor: "#EEF6F9" },
  diagnosisValue: { color: colors.patient.text, fontFamily: fontFamilies.bold, fontSize: 13, fontWeight: "700" },
  medicineHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  pillIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: colors.patient.primary },
  medicineName: { flex: 1, color: colors.patient.text, fontFamily: fontFamilies.bold, fontSize: 15, fontWeight: "700" },
  scheduleRow: { flexDirection: "row", alignItems: "center" },
  doseColumn: { flex: 1, alignItems: "center", gap: 9 },
  mealLabel: { color: colors.patient.textSecondary, fontFamily: fontFamilies.regular, fontSize: 12 },
  doseBox: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E0E5EB", borderRadius: 10, backgroundColor: colors.white },
  activeDoseBox: { borderWidth: 1.5, borderColor: colors.patient.primary },
  doseValue: { color: colors.patient.textSecondary, fontFamily: fontFamilies.semibold, fontSize: 15, fontWeight: "600" },
  activeDoseValue: { color: colors.patient.primaryDark },
  separator: { width: StyleSheet.hairlineWidth, height: 60, backgroundColor: colors.borderDefault },
  doseSummary: { alignSelf: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, overflow: "hidden", color: colors.patient.textSecondary, backgroundColor: "#F8FCFC", fontFamily: fontFamilies.medium, fontSize: 11, fontWeight: "500" },
});
