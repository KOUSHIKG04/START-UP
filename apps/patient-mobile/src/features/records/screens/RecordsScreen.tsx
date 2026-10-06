import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react-native";
import { listMyClinicalRecords } from "@startup/data-access";
import { formatDisplayDate } from "@startup/contracts";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Card, FadedScrollView, Header, useToastFeedback } from "@startup/mobile-ui";
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
  useToastFeedback({ error: records.isError ? "Could not load records." : "" });

  return (
    <View style={styles.screen}>
      <Header title="Records" app="patient" onBackPress={onBackPress} />
      <FadedScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {records.isPending ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.patient.primary} />
            <Text style={styles.stateText}>Loading records…</Text>
          </View>
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
              Your consultation records will appear here.
            </Text>
          </View>
        ) : (
          records.data.map((record) => (
            <Pressable
              key={record.appointment_id}
              accessibilityRole="button"
              accessibilityLabel={`Open record with ${record.doctor_name}`}
              onPress={() => onViewRecord(record.appointment_id)}
            >
              <Card
                borderRadius={radius.md}
                gap={spacing.sm}
                padding={spacing.md}
              >
                <Text style={styles.doctor}>{record.doctor_name}</Text>
                <Text style={styles.detail}>{record.facility_name}</Text>
                <Text style={styles.detail}>
                  {formatDisplayDate(record.started_at)} ·{" "}
                  {record.appointment_code}
                </Text>
                <Text style={styles.detail}>
                  {record.diagnoses.find((diagnosis) => diagnosis.is_primary)
                    ?.description ??
                    record.diagnoses[0]?.description ??
                    "Consultation record"}
                </Text>
                <Text style={styles.link}>View record</Text>
              </Card>
            </Pressable>
          ))
        )}
      </FadedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: { padding: spacing.md, gap: spacing.md },
  state: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  stateText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    textAlign: "center",
  },
  doctor: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
  },
  detail: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
  },
  retry: { color: colors.patient.primary, fontFamily: fontFamilies.semibold },
  link: { color: colors.patient.primary, fontFamily: fontFamilies.semibold },
});
