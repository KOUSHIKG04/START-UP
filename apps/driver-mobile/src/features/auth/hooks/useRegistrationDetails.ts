import type { DetailsScreenProps } from "../types/details-screen";
import { useToastFeedback } from "@startup/mobile-ui";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { parseDisplayDate, driverAddressSchema } from "@startup/contracts";
import type { DriverProfile } from "../types/registration";

export function useRegistrationDetails({
  initialProfile,
  profile,
  onSave,
  onBack,
  initialConsent = false,
}: DetailsScreenProps) {
  const [form, setForm] = useState<DriverProfile>(
    () =>
      initialProfile ?? profile ?? { name: "", mobile: "", dob: "", city: "" }
  );
  const [consent, setConsent] = useState(initialConsent);
  const [error, setError] = useState("");
  useToastFeedback({ error });
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const change = (key: keyof DriverProfile, value: string) =>
    setForm((old) => ({ ...old, [key]: value }));
  const pickPhoto = async () => {
    setPicking(true);
    setError("");
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Allow photo access to choose your profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        const file = result.assets[0];
        if ((file.fileSize ?? 0) > 5 * 1024 * 1024)
          setError("Choose a profile photo smaller than 5 MB.");
        else if (
          file.mimeType !== "image/jpeg" &&
          file.mimeType !== "image/png"
        )
          setError("Choose a JPG or PNG photo.");
        else
          setForm((old) => ({
            ...old,
            photo: file.uri,
            photoMimeType: file.mimeType as "image/jpeg" | "image/png",
          }));
      }
    } catch {
      setError("Could not open your photos. Please try again.");
    } finally {
      setPicking(false);
    }
  };
  const save = async () => {
    if (!driverAddressSchema.safeParse(form.address).success)
      return setError("Add and confirm your address before continuing.");
    if (!form.name.trim() || !form.city.trim() || !form.dob.trim())
      return setError("Enter your full name, date of birth and city.");
    if (
      !/^\+?[\d\s()-]+$/.test(form.mobile) ||
      ![10, 12].includes(form.mobile.replace(/\D/g, "").length)
    )
      return setError(
        "Enter a 10-digit mobile number, with an optional +91 prefix."
      );
    const birthIso = parseDisplayDate(form.dob);
    const birthDate = birthIso
      ? new Date(`${birthIso}T12:00:00`)
      : new Date(NaN);
    if (
      Number.isNaN(birthDate.getTime()) ||
      birthDate >= new Date() ||
      birthDate.getFullYear() < 1900
    )
      return setError("Enter a valid date of birth, for example 14-06-1990.");
    if (!consent)
      return setError("Agree to verification and safety checks to continue.");
    setError("");
    setSaving(true);
    try {
      await onSave({ ...form, name: form.name.trim(), city: form.city.trim() });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save your details."
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    setForm,
    consent,
    setConsent,
    picking,
    saving,
    addressOpen,
    setAddressOpen,
    change,
    pickPhoto,
    save,
  };
}
