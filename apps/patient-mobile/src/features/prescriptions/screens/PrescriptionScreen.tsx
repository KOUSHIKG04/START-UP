import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Download,
  FileText,
  Info,
  Pill,
  Share2,
  Stethoscope,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { listMyClinicalRecords } from "@startup/data-access";
import type { ClinicalRecord } from "@startup/contracts";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import {
  Button,
  Card,
  Chip,
  FadedScrollView,
  Header,
} from "@startup/mobile-ui";
import DoctorCard from "../../doctors/components/DoctorCard";
import type { PrescriptionScreenProps } from "../types/prescription";
import { supabase } from "../../../services/supabase";

export function PrescriptionScreen({
  appointment,
  appointmentId,
  onBackPress,
  onViewMedicines,
}: PrescriptionScreenProps) {
  const [downloaded, setDownloaded] = useState(false);

  const clinicalRecords = useQuery({
    queryKey: ["my-clinical-records"],
    queryFn: () => listMyClinicalRecords(supabase!),
    enabled: Boolean(supabase),
  });

  const records = clinicalRecords.data ?? [];
  const targetId = appointmentId ?? appointment?.id;
  const record: ClinicalRecord | undefined = targetId
    ? records.find(
        (r) => r.appointment_id === targetId || r.appointment_code === targetId
      )
    : records[0];

  const primaryDiagnosis =
    record?.diagnoses.find((d) => d.is_primary)?.description ??
    record?.diagnoses[0]?.description ??
    "General consultation";

  const sharePrescription = () => {
    if (!record) return;
    const medList = record.medicines
      .map(
        (m, i) =>
          `${i + 1}. ${m.medicine_name} ${m.strength} - ${m.instructions || "as prescribed"}`
      )
      .join("\n");
    Share.share({
      message: `Prescription #${record.prescription_code ?? "not issued"}\nDoctor: ${record.doctor_name} (${record.facility_name})\nDiagnosis: ${primaryDiagnosis}\n\nMedicines:\n${medList}\n\n${record.assessment ? `Advice: ${record.assessment}` : ""}`,
    });
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return new Date().toLocaleDateString();
    return new Date(isoString).toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <View style={styles.screen}>
      <Header app="patient" onBackPress={onBackPress} title="Prescription" />
      <FadedScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {clinicalRecords.isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.patient.primary} size="large" />
            <Text style={styles.stateText}>Loading prescription…</Text>
          </View>
        ) : clinicalRecords.isError ? (
          <View style={styles.centerBox}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              Could not load prescriptions. Please reopen this page to retry.
            </Text>
          </View>
        ) : !record ? (
          <View style={styles.emptyCard}>
            <FileText color={colors.patient.primary} size={42} />
            <Text style={styles.emptyTitle}>No signed prescription yet</Text>
            <Text style={styles.emptySubtitle}>
              When your doctor completes your consultation and issues a
              prescription, it will appear here.
            </Text>
          </View>
        ) : (
          <>
            <DoctorCard
              name={record.doctor_name}
              qualification={
                record.doctor_qualification ?? "Qualification pending review"
              }
              specialty={record.doctor_specialty ?? "Specialty unavailable"}
              experience=""
              rating={
                record.doctor_rating === null
                  ? "No ratings yet"
                  : `${record.doctor_rating} (${record.doctor_review_count} reviews)`
              }
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
                <Text style={styles.cardTitle}>
                  Prescription #{record.prescription_code ?? "not issued"}
                </Text>
                <Text style={styles.secondaryText}>
                  Issued {formatDate(record.signed_at ?? record.started_at)}
                </Text>
              </View>
              <Chip
                label={record.prescription_code ? "Active" : "Pending"}
                style={styles.activeChip}
                labelStyle={styles.activeChipText}
              />
            </Card>

            {record.vitals.length > 0 ? (
              <View style={styles.vitalsContainer}>
                <Text style={styles.vitalsHeader}>Recorded Vitals</Text>
                <View style={styles.vitalsRow}>
                  {record.vitals.map((v) => (
                    <View key={v.code} style={styles.vitalCard}>
                      <Text style={styles.vitalValue}>
                        {v.value} {v.unit}
                      </Text>
                      <Text style={styles.vitalLabel}>
                        {v.code.replaceAll("_", " ")}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.medicinesCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Medicines</Text>
                <Chip label={primaryDiagnosis} style={styles.diagnosisChip} />
              </View>
              {record.medicines.length === 0 ? (
                <Text style={styles.secondaryText}>
                  No medications prescribed.
                </Text>
              ) : (
                record.medicines.map((medicine, index) => {
                  const scheduleInfo = [
                    medicine.schedule?.dose_quantity &&
                    medicine.schedule?.dose_unit
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
                    <View
                      key={`${medicine.medicine_name}-${medicine.strength}-${medicine.form}`}
                      style={styles.medicineRow}
                    >
                      <View style={styles.medicineNumber}>
                        <Text style={styles.medicineNumberText}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={styles.flexCopy}>
                        <Text style={styles.medicineName}>
                          {medicine.medicine_name} {medicine.strength}
                        </Text>
                        <Text numberOfLines={2} style={styles.medicineDose}>
                          {scheduleInfo || "As directed by physician"}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
              {record.medicines.length > 0 && onViewMedicines ? (
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
                  <Text style={styles.viewDetailsText}>
                    View medicine schedule
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.adviceBanner}>
              <View style={styles.adviceIcon}>
                <Info color={colors.patient.primaryDark} size={18} />
              </View>
              <View style={styles.flexCopy}>
                <Text style={styles.adviceTitle}>
                  {record.assessment ||
                    "Rest well, stay hydrated, and take medications as prescribed."}
                </Text>
                <Text style={styles.secondaryText}>
                  {record.followup
                    ? `Follow-up: ${formatDate(record.followup.recommended_date)} · ${record.followup.reason}`
                    : "Contact clinic if symptoms persist or worsen"}
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
                leftIcon={
                  <Share2 color={colors.patient.primaryDark} size={17} />
                }
                onPress={sharePrescription}
                style={styles.shareButton}
                variant="outline"
              />
            </View>
          </>
        )}
      </FadedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: { gap: 14, padding: spacing.lg, paddingBottom: 126 },
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
  vitalsContainer: { gap: 8 },
  vitalsHeader: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
  },
  vitalsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vitalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#E0E5EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 90,
  },
  vitalValue: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
  },
  vitalLabel: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    textTransform: "capitalize",
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
    fontSize: 10,
    lineHeight: 14,
  },
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
  viewDetailsText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
  },
  pressed: { opacity: 0.72 },
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
