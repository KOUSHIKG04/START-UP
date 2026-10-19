import { useVerificationStatus } from "../hooks/useVerificationStatus";
import { documentControlHeight, labels } from "../utils/verificationConstants";

import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FileCheck2, RefreshCw } from "lucide-react-native";

import { Button, Loader } from "@startup/mobile-ui";
import { colors, fontFamilies } from "@startup/design-tokens";
import { DoctorHeader } from "../../../components/DoctorScreen";
import { palette } from "../../../components/theme";

export default function VerificationStatusScreen() {
  const {
    submitted,
    review,
    loading,
    refreshing,
    refresh,
    uploading,
    continuing,
    refreshRotation,
    latest,
    documentNames,
    blocked,
    canContinue,
    rejected,
    unavailable,
    status,
    Icon,
    summary,
    replaceDocument,
    continueToDashboard,
  } = useVerificationStatus();
  return (
    <View style={styles.screen}>
      <DoctorHeader title="Verification Status" />
      <SafeAreaView edges={["bottom"]} style={styles.body}>
        {loading ? (
          <Loader theme="doctor" size="large" style={styles.body} />
        ) : (
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.content}
          >
            <View style={styles.summary}>
              <Icon
                size={56}
                color={rejected || blocked ? "#A23C2D" : palette.primary}
              />
              <Text style={styles.status}>{status}</Text>
              <Text style={styles.summaryText}>{summary}</Text>
            </View>
            {!unavailable ? (
              <Text style={styles.sectionTitle}>Submitted documents</Text>
            ) : null}
            {!unavailable
              ? documentNames.map(({ kind, title }) => {
                  const document = latest(kind);
                  const approved = document?.status === "approved";
                  const needsReplacement = document?.status === "rejected";
                  return (
                    <View key={kind} style={styles.document}>
                      <View style={styles.documentHeading}>
                        <FileCheck2 size={20} color={palette.primary} />
                        <Text style={styles.documentTitle}>{title}</Text>
                        <View
                          accessible
                          accessibilityLabel={`${title}: ${document ? (labels[document.status] ?? "Pending review") : "Not submitted"}`}
                          style={[
                            styles.statusDot,
                            approved
                              ? styles.approvedDot
                              : needsReplacement
                                ? styles.rejectedDot
                                : styles.pendingDot,
                          ]}
                        />
                      </View>
                      {needsReplacement ? (
                        <View style={styles.reason}>
                          <Text style={styles.reasonTitle}>
                            Reviewer’s reason
                          </Text>
                          <Text style={styles.reasonText}>
                            {document.rejection_reason ||
                              "No reason was provided. Contact Clinzo support for clarification."}
                          </Text>
                        </View>
                      ) : null}
                      {!blocked &&
                      submitted &&
                      (!document || needsReplacement) &&
                      review?.status !== "verified" ? (
                        <Button
                          theme="doctor"
                          variant="outline"
                          label={
                            document ? "Replace document" : "Upload document"
                          }
                          loading={kind !== "medical_registration" && uploading}
                          disabled={uploading}
                          onPress={() =>
                            kind === "medical_degree" ||
                            kind === "clinic_operating_licence"
                              ? void replaceDocument(kind)
                              : router.push("/onboarding")
                          }
                        />
                      ) : null}
                    </View>
                  );
                })
              : null}
            <View style={styles.legendRow}>
              {!unavailable ? (
                <View style={styles.legend}>
                  {[
                    { label: "Pending", style: styles.pendingDot },
                    { label: "Rejected", style: styles.rejectedDot },
                    { label: "Approved", style: styles.approvedDot },
                  ].map((item) => (
                    <View key={item.label} style={styles.legendItem}>
                      <View style={[styles.statusDot, item.style]} />
                      <Text style={styles.legendText}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.legend} />
              )}
              <Button
                theme="doctor"
                variant="outline"
                accessibilityLabel="Refresh verification status"
                accessibilityState={{ busy: refreshing }}
                disabled={refreshing || uploading || continuing}
                onPress={() => void refresh()}
                style={styles.refreshButton}
              >
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: refreshRotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "360deg"],
                        }),
                      },
                    ],
                  }}
                >
                  <RefreshCw size={19} color={palette.primary} />
                </Animated.View>
                <Text style={styles.refreshText}>Refresh</Text>
              </Button>
            </View>
            {submitted === false && !blocked ? (
              <Button
                theme="doctor"
                label="Complete profile"
                onPress={() => router.push("/onboarding")}
              />
            ) : null}
          </ScrollView>
        )}
        {!loading && canContinue ? (
          <View style={styles.footer}>
            <Button
              theme="doctor"
              label="Go to Dashboard"
              loading={continuing}
              disabled={uploading || refreshing}
              style={styles.dashboardButton}
              onPress={() => void continueToDashboard()}
            />
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.white },
  body: { flex: 1 },
  content: { padding: 24, gap: 16 },
  summary: { alignItems: "center", paddingVertical: 24, gap: 14 },
  status: {
    fontFamily: fontFamilies.semibold,
    fontSize: 19,
    lineHeight: 25,
    color: palette.header,
    textAlign: "center",
  },
  refreshButton: {
    height: 44,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderRadius: 22,
    borderColor: palette.border,
    backgroundColor: colors.white,
    flexDirection: "row",
    gap: 6,
  },
  refreshText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: palette.primary,
  },
  summaryText: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    textAlign: "center",
  },
  sectionTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 8,
    textAlign: "left",
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  legend: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: palette.text,
  },
  document: {
    minHeight: documentControlHeight,
    backgroundColor: colors.white,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: palette.white,
  },
  dashboardButton: {
    height: documentControlHeight,
    minHeight: documentControlHeight,
    paddingVertical: 0,
  },
  documentHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  documentTitle: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  pendingDot: { backgroundColor: "#F59E0B" },
  rejectedDot: { backgroundColor: colors.danger },
  approvedDot: { backgroundColor: colors.success },
  reason: { gap: 6 },
  reasonTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: "#A23C2D",
  },
  reasonText: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
});
