import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Pill } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { listMyClinicalRecords } from "@startup/data-access";
import type { ClinicalRecord } from "@startup/contracts";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, Card, Chip, FadedScrollView, Header, useToastFeedback } from "@startup/mobile-ui";
import type { MedicinesScreenProps } from "../types/medicines";
import { supabase } from "../../../services/supabase";

export function MedicinesScreen({
  appointmentId,
  onBackPress,
}: MedicinesScreenProps) {
  const clinicalRecords = useQuery({
    queryKey: ["my-clinical-records"],
    queryFn: () => listMyClinicalRecords(supabase!),
    enabled: Boolean(supabase),
  });
  useToastFeedback({ error: clinicalRecords.isError ? "Could not load medications. Please retry." : "" });

  const records = clinicalRecords.data ?? [];
  const record: ClinicalRecord | undefined = appointmentId
    ? records.find(
        (r) =>
          r.appointment_id === appointmentId ||
          r.appointment_code === appointmentId
      )
    : records[0];

  const primaryDiagnosis =
    record?.diagnoses.find((d) => d.is_primary)?.description ??
    record?.diagnoses[0]?.description ??
    "Diagnosis not recorded";

  return (
    <View style={styles.screen}>
      <Header app="patient" onBackPress={onBackPress} title="Medicines" />
      <FadedScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {clinicalRecords.isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.patient.primary} size="large" />
            <Text style={styles.stateText}>Loading medicines…</Text>
          </View>
        ) : clinicalRecords.isError ? (
          <View style={styles.centerBox}>
            <Button label="Retry" onPress={() => void clinicalRecords.refetch()} />
          </View>
        ) : !record || record.medicines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Pill color={colors.patient.primary} size={42} />
            <Text style={styles.emptyTitle}>No medications prescribed</Text>
            <Text style={styles.emptySubtitle}>
              Active medication schedules from your consultations will be listed
              here.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.diagnosisRow}>
              <Text style={styles.diagnosisLabel}>CURRENT DIAGNOSIS</Text>
              <Chip
                label={primaryDiagnosis}
                style={styles.diagnosisChip}
                labelStyle={styles.diagnosisValue}
              />
            </View>

            {record.medicines.map((medicine) => {
              const qty = Number(medicine.schedule?.dose_quantity ?? 1);
              const breakfast = medicine.schedule?.timings.some(
                (t) => t.meal_anchor === "breakfast"
              )
                ? qty
                : 0;
              const lunch = medicine.schedule?.timings.some(
                (t) => t.meal_anchor === "lunch"
              )
                ? qty
                : 0;
              const dinner = medicine.schedule?.timings.some(
                (t) => t.meal_anchor === "dinner"
              )
                ? qty
                : 0;

              const doseSummary = [
                medicine.schedule?.dose_quantity && medicine.schedule?.dose_unit
                  ? `${medicine.schedule.dose_quantity} ${medicine.schedule.dose_unit}`
                  : null,
                medicine.schedule?.timings
                  ?.map((t) => `${t.meal_relation} ${t.meal_anchor}`)
                  .join(", "),
                medicine.instructions,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <Card
                  key={`${medicine.medicine_name}-${medicine.strength}-${medicine.form}`}
                  borderRadius={radius.md}
                  gap={14}
                  padding={15}
                >
                  <View style={styles.medicineHeader}>
                    <View style={styles.pillIcon}>
                      <Pill color={colors.white} size={18} />
                    </View>
                    <Text style={styles.medicineName}>
                      {medicine.medicine_name} {medicine.strength}
                    </Text>
                  </View>

                  <View style={styles.scheduleRow}>
                    <Dose label="Breakfast" value={breakfast} />
                    <View style={styles.separator} />
                    <Dose label="Lunch" value={lunch} />
                    <View style={styles.separator} />
                    <Dose label="Dinner" value={dinner} />
                  </View>

                  <Text style={styles.doseSummary}>
                    {doseSummary || "As directed by physician"}
                  </Text>
                </Card>
              );
            })}
          </>
        )}
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
        <Text
          style={[
            styles.doseValue,
            active ? styles.activeDoseValue : undefined,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: { gap: 16, padding: spacing.lg, paddingBottom: 126 },
  centerBox: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  stateText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  errorText: {
    color: colors.danger,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    textAlign: "center",
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E0E5EB",
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  diagnosisRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  diagnosisLabel: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
  },
  diagnosisChip: { borderWidth: 0, backgroundColor: "#EEF6F9" },
  diagnosisValue: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: "700",
  },
  medicineHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  pillIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: colors.patient.primary,
  },
  medicineName: {
    flex: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
  },
  scheduleRow: { flexDirection: "row", alignItems: "center" },
  doseColumn: { flex: 1, alignItems: "center", gap: 9 },
  mealLabel: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  doseBox: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E5EB",
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  activeDoseBox: { borderWidth: 1.5, borderColor: colors.patient.primary },
  doseValue: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    fontWeight: "600",
  },
  activeDoseValue: { color: colors.patient.primaryDark },
  separator: {
    width: StyleSheet.hairlineWidth,
    height: 60,
    backgroundColor: colors.borderDefault,
  },
  doseSummary: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: "hidden",
    color: colors.patient.textSecondary,
    backgroundColor: "#F8FCFC",
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: "500",
  },
});
