import { useToastFeedback } from "@startup/mobile-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { colors, fontFamilies } from "@startup/design-tokens";
import { getMyVerificationCase, hasMyDoctorClaim, submitMyDoctorDegree, type MyVerificationCase } from "@startup/data-access";
import { OnboardingButton, OnboardingShell } from "../../features/auth/components/OnboardingShell";
import { mobileSession, supabase, useMobileSession } from "../../services/supabase";
import { signOutWithPushCleanup } from "../../features/notifications/deviceNotifications";

const verification = require("../../../assets/images/onboarding/verification.png");

export default function ReviewStatus() {
  const { profile } = useMobileSession();
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const [review, setReview] = useState<MyVerificationCase | null>(null);
  const [error, setError] = useState("");
  useToastFeedback({ error });
  const [uploading, setUploading] = useState(false);
  const mounted = useRef(false);
  const checking = useRef(false);
  const refresh = useCallback(async () => {
    if (!supabase || checking.current) return;
    checking.current = true;
    try {
      const claim = await hasMyDoctorClaim(supabase);
      const doctorId = profile?.doctor?.id;
      const currentReview = doctorId ? await getMyVerificationCase(supabase, "doctor", doctorId) : null;
      if (!mounted.current) return;
      setSubmitted(claim);
      setReview(currentReview);
      setError("");
      await mobileSession.refresh();
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Could not refresh verification status.");
    } finally { checking.current = false; }
  }, [profile?.doctor?.id]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const interval = setInterval(() => { if (AppState.currentState === "active") void refresh(); }, 10000);
    return () => { mounted.current = false; clearInterval(interval); };
  }, [refresh]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void refresh(); });
    return () => subscription.remove();
  }, [refresh]);
  const needsDegree = review !== null && review.status !== "verified" && !review.documents.some(document => document.kind === "medical_degree" && document.status !== "rejected");
  const needsRegistrationReplacement = review?.documents.some(document => document.kind === "medical_registration" && document.status === "rejected") ?? false;
  async function uploadDegree() {
    if (!supabase || uploading) return;
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true });
      if (picked.canceled) return;
      const document = picked.assets[0];
      if ((document.size ?? 0) > 10 * 1024 * 1024) throw new Error("Choose a degree file smaller than 10 MB.");
      setUploading(true); setError("");
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw authError ?? new Error("Session expired.");
      const extension = document.mimeType === "application/pdf" ? "pdf" : document.mimeType === "image/png" ? "png" : "jpg";
      const path = `${data.user.id}/${Crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from("doctor-licenses").upload(path, await new File(document.uri).arrayBuffer(), { contentType: document.mimeType ?? "application/pdf", upsert: false });
      if (upload.error) throw upload.error;
      await submitMyDoctorDegree(supabase, path);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit your degree."); }
    finally { setUploading(false); }
  }
  return <OnboardingShell onBack={() => router.back()}><View style={styles.body}>
    <Image source={verification} style={styles.image} resizeMode="contain" />
    <Text style={styles.title}>Thank You!</Text>
    <Text style={styles.description}>{profile?.doctor?.status === "suspended" ? "Your account needs support before you can practise." : submitted === false ? "Complete your credential submission to start verification." : review?.status === "needs_resubmission" ? "A document needs a clearer replacement before verification can continue." : needsDegree ? "Upload your degree certificate to complete document review." : review?.status === "under_review" && review.documents.every(document => document.status === "approved") ? "Your documents are approved. Awaiting final Clinzo Company Admin verification." : "Please Wait Until We Verify Your Profile"}</Text>
    {review?.documents.filter((document) => document.status === "rejected").map((document) => <Text key={document.kind} style={styles.error}>{document.kind.replaceAll("_"," ")}: {document.rejection_reason}</Text>)}
    <View style={styles.actions}>{submitted === false || needsRegistrationReplacement ? <OnboardingButton label={submitted === false ? "Complete profile" : "Replace document"} onPress={() => router.push("/onboarding")} /> : <OnboardingButton variant="outline" label="Check status" onPress={() => void refresh()} />}{needsDegree ? <View style={styles.degreeAction}><OnboardingButton label={uploading ? "Uploading degree…" : "Upload degree certificate"} disabled={uploading} onPress={() => void uploadDegree()} /></View> : null}</View>
    <Pressable accessibilityRole="button" onPress={() => void signOutWithPushCleanup()} style={styles.signOut}><Text style={styles.signOutText}>Sign out</Text></Pressable>
  </View></OnboardingShell>;
}
const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", paddingTop: 75 }, image: { width: "100%", height: 240, maxWidth: 361 },
  title: { marginTop: 10, fontFamily: fontFamilies.bold, color: "#0A4A47", fontSize: 26 },
  description: { marginTop: 16, fontFamily: fontFamilies.regular, color: colors.textPrimary, fontSize: 17, textAlign: "center", lineHeight: 27 },
  actions: { width: "100%", maxWidth: 296, marginTop: 30 }, degreeAction: { marginTop: 12 }, signOut: { padding: 15, marginTop: 7 }, signOutText: { color: colors.patient.primaryDark, fontFamily: fontFamilies.medium, fontSize: 14 },
  error: { color: colors.danger, fontFamily: fontFamilies.regular, marginTop: 10, textAlign: "center" },
});
