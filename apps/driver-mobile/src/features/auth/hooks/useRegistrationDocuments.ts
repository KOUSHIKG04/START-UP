import type { DocumentsScreenProps } from "../types/documents-screen";
import { useToastFeedback } from "@startup/mobile-ui";
import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { documentTypes } from "../utils/registrationConstants";
import type { RegistrationDocuments } from "../types/registration";
export function useRegistrationDocuments({
  onSubmit,
  onBack,
  initialDocuments,
}: DocumentsScreenProps) {
  const [classification, setClassification] = useState<
    RegistrationDocuments["classification"]
  >(initialDocuments?.classification ?? "ALS");
  const [registration, setRegistration] = useState(
    initialDocuments?.registration ?? ""
  );
  const [files, setFiles] = useState<RegistrationDocuments["files"]>(
    initialDocuments?.files ?? {}
  );
  const [error, setError] = useState("");
  useToastFeedback({ error });
  const [picking, setPicking] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pick = async (doc: (typeof documentTypes)[number]) => {
    setPicking(doc.name);
    setError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: doc.image
          ? ["image/jpeg", "image/png"]
          : ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        const file = result.assets[0];
        if ((file.size ?? 0) > 10 * 1024 * 1024)
          setError("Choose a file smaller than 10 MB.");
        else setFiles((old) => ({ ...old, [doc.name]: file }));
      }
    } catch {
      setError("Could not open your files. Please try again.");
    } finally {
      setPicking(null);
    }
  };
  const submit = async () => {
    if (!registration.trim())
      return setError("Enter the ambulance registration number.");
    const missing = documentTypes.filter((doc) => !files[doc.name]);
    if (missing.length)
      return setError(
        `Add all required documents to continue. ${missing.length} remaining.`
      );
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        classification,
        registration: registration.trim().toUpperCase(),
        files,
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not submit documents."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return {
    classification,
    setClassification,
    registration,
    setRegistration,
    files,
    picking,
    submitting,
    pick,
    submit,
  };
}
