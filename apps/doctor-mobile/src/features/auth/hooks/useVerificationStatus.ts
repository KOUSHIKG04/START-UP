import { doctorDocuments, labels } from "../utils/verificationConstants";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { useFocusEffect } from "expo-router";
import { CircleCheck, Clock3, CircleAlert } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import {
  submitMyDoctorDegree,
  submitMyClinicOperatingLicence,
} from "@startup/data-access";
import { mobileSession, supabase } from "../../../services/supabase";
import { useDoctorVerification } from "./useDoctorVerification";

export function useVerificationStatus() {
  const { submitted, profile, review, error, loading, refreshing, refresh } =
    useDoctorVerification({ refreshSession: false });
  const { showToast } = useToast();
  useToastFeedback({ error });
  const [uploading, setUploading] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const refreshRotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!refreshing) {
      refreshRotation.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.timing(refreshRotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => {
      animation.stop();
      refreshRotation.setValue(0);
    };
  }, [refreshing, refreshRotation]);
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
      };
    }, [])
  );
  const latest = (kind: string) =>
    review?.documents
      .filter((document) => document.kind === kind)
      .sort((a, b) => b.version - a.version)[0];
  const documentNames = review?.requires_clinic_licence
    ? [
        ...doctorDocuments,
        { kind: "clinic_operating_licence", title: "Clinic operating licence" },
      ]
    : doctorDocuments;
  const allApproved = documentNames.every(
    (document) => latest(document.kind)?.status === "approved"
  );
  const blocked = profile?.doctor?.status === "suspended";
  const canContinue = allApproved && review?.status === "verified" && !blocked;
  const rejected = review?.status === "needs_resubmission";
  const unavailable = Boolean(error && !review);
  const status = unavailable
    ? "Status unavailable"
    : blocked
      ? "Account suspended"
      : submitted === false
        ? "Profile incomplete"
        : (labels[review?.status ?? "pending"] ?? "Pending review");
  const Icon =
    blocked || rejected
      ? CircleAlert
      : review?.status === "verified"
        ? CircleCheck
        : Clock3;
  const summary = unavailable
    ? "Refresh to retrieve the latest decision from Clinzo."
    : blocked
      ? "Contact Clinzo support about your account."
      : submitted === false
        ? "Complete your profile and upload the required documents to start review."
        : rejected
          ? "Read the reviewer’s reasons below and replace the affected documents."
          : review?.status === "verified"
            ? "Your profile is verified. You’re ready to continue to your dashboard."
            : allApproved
              ? "All required documents are approved. Final Clinzo company verification is still pending."
              : "Clinzo is reviewing your submitted documents. This page updates while it is open.";

  async function replaceDocument(
    kind: "medical_degree" | "clinic_operating_licence"
  ) {
    if (!supabase || uploading) return;
    setUploading(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !focused.current) return;
      const document = picked.assets[0];
      if ((document.size ?? 0) > 10 * 1024 * 1024)
        throw new Error("Choose a document smaller than 10 MB.");
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user)
        throw authError ?? new Error("Session expired.");
      const extension =
        document.mimeType === "application/pdf"
          ? "pdf"
          : document.mimeType === "image/png"
            ? "png"
            : "jpg";
      const path = `${data.user.id}/${Crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage
        .from("doctor-licenses")
        .upload(path, await new File(document.uri).arrayBuffer(), {
          contentType: document.mimeType ?? "application/pdf",
          upsert: false,
        });
      if (upload.error) throw upload.error;
      if (kind === "medical_degree") await submitMyDoctorDegree(supabase, path);
      else await submitMyClinicOperatingLicence(supabase, path);
      if (focused.current) {
        await refresh();
        showToast({ title: "Document submitted for review", type: "success" });
      }
    } catch (cause) {
      if (focused.current)
        showToast({
          title: "Could not submit document",
          message: cause instanceof Error ? cause.message : "Try again.",
          type: "error",
        });
    } finally {
      if (focused.current) setUploading(false);
    }
  }

  async function continueToDashboard() {
    if (!canContinue || continuing) return;
    setContinuing(true);
    try {
      await mobileSession.refresh();
      const current = mobileSession.getSnapshot();
      if (current.error) throw new Error(current.error);
      if (current.profile?.doctor?.status !== "verified")
        throw new Error(
          "Company verification is not complete yet. Refresh your status."
        );
      showToast({
        title: "Welcome to Clinzo!",
        message: "Your profile is verified. Thank you for joining us.",
        type: "success",
      });
      // The existing protected navigator opens the Doctor app after session refresh.
    } catch (cause) {
      if (focused.current)
        showToast({
          title: "Could not open dashboard",
          message: cause instanceof Error ? cause.message : "Try again.",
          type: "error",
        });
    } finally {
      if (focused.current) setContinuing(false);
    }
  }

  return {
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
  };
}
