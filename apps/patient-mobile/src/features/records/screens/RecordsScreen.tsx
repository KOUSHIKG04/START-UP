import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, FileText, Stethoscope } from "lucide-react-native";
import { listMyClinicalRecords } from "@startup/data-access";
import { formatDisplayDate, type ClinicalRecord } from "@startup/contracts";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Card, FadedScrollView, Header, Skeleton, useToastFeedback } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";
import type { RecordsScreenProps } from "../types/records";

export function RecordsScreen({
  onBackPress,
  onViewRecord,
}: RecordsScreenProps) {
  const records = useQuery({
    queryKey: ["my-clinical-records"],
    queryFn: () => listMyClinicalRecords(supabase!),
    enabled: Boolean(supabase),
  });
  useFocusEffect(useCallback(() => {
    if (supabase) void records.refetch();
  }, [records.refetch]));
  useToastFeedback({ error: records.isError ? "Could not load records." : "" });

  return (
    <View style={styles.screen}>
      <Header title="Records" app="patient" onBackPress={onBackPress} />
      <FadedScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {records.isPending ? (
          <View style={styles.loadingList}><Skeleton theme="patient" height={124} radius={14} /><Skeleton theme="patient" height={124} radius={14} /></View>
        ) : records.isError ? (
          <View style={styles.state}>
            <Pressable
              accessibilityRole="button"
              onPress={() => records.refetch()}
            >
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          </View>
        ) : records.data.length === 0 ? (
          <View style={styles.state}>
            <FileText color={colors.patient.primary} size={38} />
            <Text style={styles.stateText}>
              Signed prescriptions and completed consultation records will appear here.
            </Text>
          </View>
        ) : (
          records.data.map((record: ClinicalRecord) => {
            const hasPrescription = Boolean(record.prescription_code);
            const diagnosis = record.diagnoses.find((item) => item.is_primary)?.description ?? record.diagnoses[0]?.description;
            return <Card
              key={record.appointment_id}
              accessibilityRole={hasPrescription ? "button" : undefined}
              accessibilityLabel={hasPrescription ? `Open prescription from ${record.doctor_name}` : undefined}
              onPress={hasPrescription ? () => onViewRecord(record.appointment_id) : undefined}
              borderRadius={radius.md}
              gap={12}
              padding={spacing.md}
              backgroundColor={colors.white}
            >
              <View style={styles.cardHeading}>
                <View style={styles.iconSurface}>{hasPrescription ? <FileText color={colors.patient.primary} size={20} /> : <Stethoscope color={colors.patient.primary} size={20} />}</View>
                <View style={styles.headingText}>
                  <Text style={styles.cardTitle}>{hasPrescription ? "Prescription" : "Consultation record"}</Text>
                  <Text numberOfLines={1} style={styles.doctor}>{record.doctor_name}</Text>
                </View>
                {hasPrescription ? <ChevronRight color={colors.patient.primary} size={20} /> : null}
              </View>
              <View style={styles.cardBody}>
                <Text numberOfLines={1} style={styles.facility}>{record.facility_name}</Text>
                {diagnosis ? <Text numberOfLines={2} style={styles.summary}>{diagnosis}</Text> : null}
                {hasPrescription ? <Text style={styles.summary}>{record.medicines.length} {record.medicines.length === 1 ? "medicine" : "medicines"} prescribed</Text> : null}
              </View>
              <View style={styles.cardFooter}>
                <View style={styles.dateRow}><CalendarDays color={colors.patient.textSecondary} size={14} /><Text style={styles.dateText}>{formatDisplayDate(record.signed_at ?? record.started_at)}</Text></View>
                {hasPrescription ? <Text style={styles.link}>View prescription</Text> : null}
              </View>
            </Card>;
          })
        )}
      </FadedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: { padding: spacing.md, gap: spacing.md },
  state: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  loadingList: { gap: spacing.md },
  stateText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    textAlign: "center",
  },
  doctor: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconSurface: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.patient.surface },
  headingText: { flex: 1, minWidth: 0, gap: 3 },
  cardTitle: { color: colors.patient.primaryDark, fontFamily: fontFamilies.bold, fontSize: 16 },
  cardBody: { gap: 5, paddingLeft: 54 },
  facility: { color: colors.patient.textSecondary, fontFamily: fontFamilies.regular, fontSize: 12 },
  summary: { color: colors.patient.text, fontFamily: fontFamilies.regular, fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDefault },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { color: colors.patient.textSecondary, fontFamily: fontFamilies.regular, fontSize: 12 },
  retry: { color: colors.patient.primary, fontFamily: fontFamilies.semibold },
  link: { color: colors.patient.primary, fontFamily: fontFamilies.semibold },
});
