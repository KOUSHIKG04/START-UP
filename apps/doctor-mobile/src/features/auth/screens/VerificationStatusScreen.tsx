import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CircleCheck, Clock3, FileCheck2, CircleAlert, RefreshCw } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { Button, Loader, useToast, useToastFeedback } from "@startup/mobile-ui";
import { colors, fontFamilies } from "@startup/design-tokens";
import { DoctorHeader } from "../../../components/DoctorScreen";
import { palette } from "../../../components/theme";
import { submitMyDoctorDegree, submitMyClinicOperatingLicence } from "@startup/data-access";
import { mobileSession, supabase } from "../../../services/supabase";
import { useDoctorVerification } from "../hooks/useDoctorVerification";

const doctorDocuments = [{ kind: "medical_registration", title: "Medical registration" }, { kind: "medical_degree", title: "Degree certificate" }];
const documentControlHeight = 56;
const labels: Record<string, string> = { pending: "Pending review", under_review: "Under review", needs_resubmission: "Update required", verified: "Verified", approved: "Approved", rejected: "Rejected", submitted: "Pending review" };

export default function VerificationStatusScreen() {
  const { submitted, profile, review, error, loading, refreshing, refresh } = useDoctorVerification({ refreshSession: false, pollIntervalMs: 3000 });
  const { showToast } = useToast();
  useToastFeedback({ error });
  const [uploading, setUploading] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const refreshRotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!refreshing) { refreshRotation.setValue(0); return; }
    const animation = Animated.loop(Animated.timing(refreshRotation, {
      toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true,
    }));
    animation.start();
    return () => { animation.stop(); refreshRotation.setValue(0); };
  }, [refreshing, refreshRotation]);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => { focused.current = true; return () => { focused.current = false; }; }, []));
  const latest = (kind: string) => review?.documents.filter(document => document.kind === kind).sort((a, b) => b.version - a.version)[0];
  const documentNames = review?.requires_clinic_licence ? [...doctorDocuments, { kind: "clinic_operating_licence", title: "Clinic operating licence" }] : doctorDocuments;
  const allApproved = documentNames.every(document => latest(document.kind)?.status === "approved");
  const blocked = profile?.doctor?.status === "suspended";
  const canContinue = allApproved && review?.status === "verified" && !blocked;
  const rejected = review?.status === "needs_resubmission";
  const unavailable = Boolean(error && !review);
  const status = unavailable ? "Status unavailable" : blocked ? "Account suspended" : submitted === false ? "Profile incomplete" : labels[review?.status ?? "pending"] ?? "Pending review";
  const Icon = blocked || rejected ? CircleAlert : review?.status === "verified" ? CircleCheck : Clock3;
  const summary = unavailable ? "Refresh to retrieve the latest decision from Clinzo."
    : blocked ? "Contact Clinzo support about your account."
    : submitted === false ? "Complete your profile and upload the required documents to start review."
    : rejected ? "Read the reviewer’s reasons below and replace the affected documents."
    : review?.status === "verified" ? "Your profile is verified. You’re ready to continue to your dashboard."
    : allApproved ? "All required documents are approved. Final Clinzo company verification is still pending."
    : "Clinzo is reviewing your submitted documents. This page updates while it is open.";

  async function replaceDocument(kind: "medical_degree" | "clinic_operating_licence") {
    if (!supabase || uploading) return;
    setUploading(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true });
      if (picked.canceled || !focused.current) return;
      const document = picked.assets[0];
      if ((document.size ?? 0) > 10 * 1024 * 1024) throw new Error("Choose a document smaller than 10 MB.");
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw authError ?? new Error("Session expired.");
      const extension = document.mimeType === "application/pdf" ? "pdf" : document.mimeType === "image/png" ? "png" : "jpg";
      const path = `${data.user.id}/${Crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from("doctor-licenses").upload(path, await new File(document.uri).arrayBuffer(), { contentType: document.mimeType ?? "application/pdf", upsert: false });
      if (upload.error) throw upload.error;
      if (kind === "medical_degree") await submitMyDoctorDegree(supabase, path);
      else await submitMyClinicOperatingLicence(supabase, path);
      if (focused.current) { await refresh(); showToast({ title: "Document submitted for review", type: "success" }); }
    } catch (cause) {
      if (focused.current) showToast({ title: "Could not submit document", message: cause instanceof Error ? cause.message : "Try again.", type: "error" });
    } finally { if (focused.current) setUploading(false); }
  }

  async function continueToDashboard() {
    if (!canContinue || continuing) return;
    setContinuing(true);
    try {
      await mobileSession.refresh();
      const current = mobileSession.getSnapshot();
      if (current.error) throw new Error(current.error);
      if (current.profile?.doctor?.status !== "verified") throw new Error("Company verification is not complete yet. Refresh your status.");
      showToast({ title: "Welcome to Clinzo!", message: "Your profile is verified. Thank you for joining us.", type: "success" });
      // The existing protected navigator opens the Doctor app after session refresh.
    } catch (cause) {
      if (focused.current) showToast({ title: "Could not open dashboard", message: cause instanceof Error ? cause.message : "Try again.", type: "error" });
    } finally { if (focused.current) setContinuing(false); }
  }

  return <View style={styles.screen}>
    <DoctorHeader title="Verification Status" />
    <SafeAreaView edges={["bottom"]} style={styles.body}>
      {loading ? <Loader theme="doctor" size="large" style={styles.body} /> : <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Icon size={56} color={rejected || blocked ? "#A23C2D" : palette.primary} />
          <Text style={styles.status}>{status}</Text>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>
        {!unavailable ? <Text style={styles.sectionTitle}>Submitted documents</Text> : null}
        {!unavailable ? documentNames.map(({ kind, title }) => {
          const document = latest(kind);
          const approved = document?.status === "approved";
          const needsReplacement = document?.status === "rejected";
          return <View key={kind} style={styles.document}>
            <View style={styles.documentHeading}>
              <FileCheck2 size={20} color={palette.primary} />
              <Text style={styles.documentTitle}>{title}</Text>
              <View accessible accessibilityLabel={`${title}: ${document ? labels[document.status] ?? "Pending review" : "Not submitted"}`}
                style={[styles.statusDot, approved ? styles.approvedDot : needsReplacement ? styles.rejectedDot : styles.pendingDot]} />
            </View>
            {needsReplacement ? <View style={styles.reason}>
              <Text style={styles.reasonTitle}>Reviewer’s reason</Text>
              <Text style={styles.reasonText}>{document.rejection_reason || "No reason was provided. Contact Clinzo support for clarification."}</Text>
            </View> : null}
            {!blocked && submitted && (!document || needsReplacement) && review?.status !== "verified" ?
              <Button theme="doctor" variant="outline" label={document ? "Replace document" : "Upload document"}
                loading={kind !== "medical_registration" && uploading} disabled={uploading}
                onPress={() => kind === "medical_degree" || kind === "clinic_operating_licence" ? void replaceDocument(kind) : router.push("/onboarding")} /> : null}
          </View>;
        }) : null}
        <View style={styles.legendRow}>
        {!unavailable ? <View style={styles.legend}>
          {[
            { label: "Pending", style: styles.pendingDot },
            { label: "Rejected", style: styles.rejectedDot },
            { label: "Approved", style: styles.approvedDot },
          ].map(item => <View key={item.label} style={styles.legendItem}>
            <View style={[styles.statusDot, item.style]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>)}
        </View> : <View style={styles.legend} />}
          <Button theme="doctor" variant="outline" accessibilityLabel="Refresh verification status"
            accessibilityState={{ busy: refreshing }} disabled={refreshing || uploading || continuing} onPress={() => void refresh()} style={styles.refreshButton}>
            <Animated.View style={{ transform: [{ rotate: refreshRotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}>
              <RefreshCw size={19} color={palette.primary} />
            </Animated.View>
            <Text style={styles.refreshText}>Refresh</Text>
          </Button>
        </View>
        {submitted === false && !blocked ? <Button theme="doctor" label="Complete profile" onPress={() => router.push("/onboarding")} /> : null}
      </ScrollView>}
      {!loading && canContinue ? <View style={styles.footer}>
        <Button theme="doctor" label="Go to Dashboard" loading={continuing} disabled={uploading || refreshing} style={styles.dashboardButton} onPress={() => void continueToDashboard()} />
      </View> : null}
    </SafeAreaView>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.white }, body: { flex: 1 },
  content: { padding: 24, gap: 16 },
  summary: { alignItems: "center", paddingVertical: 24, gap: 14 },
  status: { fontFamily: fontFamilies.semibold, fontSize: 19, lineHeight: 25, color: palette.header, textAlign: "center" },
  refreshButton: { height: 44, minHeight: 44, paddingHorizontal: 12, paddingVertical: 0, borderRadius: 22, borderColor: palette.border, backgroundColor: colors.white, flexDirection: "row", gap: 6 },
  refreshText: { fontFamily: fontFamilies.medium, fontSize: 13, color: palette.primary },
  summaryText: { fontFamily: fontFamilies.regular, fontSize: 15, lineHeight: 22, color: colors.textPrimary, textAlign: "center" },
  sectionTitle: { fontFamily: fontFamilies.medium, fontSize: 16, color: colors.textPrimary, marginTop: 8, textAlign: "left" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  legend: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { fontFamily: fontFamilies.regular, fontSize: 13, color: palette.text },
  document: { minHeight: documentControlHeight, backgroundColor: colors.white, borderColor: palette.border, borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, backgroundColor: palette.white },
  dashboardButton: { height: documentControlHeight, minHeight: documentControlHeight, paddingVertical: 0 },
  documentHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  documentTitle: { flex: 1, fontFamily: fontFamilies.medium, fontSize: 16, lineHeight: 22, color: colors.textPrimary },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  pendingDot: { backgroundColor: "#F59E0B" }, rejectedDot: { backgroundColor: colors.danger }, approvedDot: { backgroundColor: colors.success },
  reason: { gap: 6 }, reasonTitle: { fontFamily: fontFamilies.medium, fontSize: 13, color: "#A23C2D" },
  reasonText: { fontFamily: fontFamilies.regular, fontSize: 15, lineHeight: 22, color: colors.textPrimary },
});
