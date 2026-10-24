import type { ProfileFormProps } from "../types/profile-form";
import {
  getInitialFormValues,
  formatProfilePayload,
} from "../utils/profileForm";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { contactPhoneForInput } from "@startup/contracts";
import { useForm } from "react-hook-form";
import type { ProfileDetails, ProfileFormValues } from "../types/profile";
import { useToastFeedback } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";

export function useProfileForm({
  family = false,
  initialEmail = "",
  initialPhone = "",
  initialProfile,
  onSave,
}: ProfileFormProps) {
  const [submitError, setSubmitError] = useState("");
  const [photo, setPhoto] = useState<ProfileDetails["photo"]>();
  const [photoUrl, setPhotoUrl] = useState<string>();

  useEffect(() => {
    if (!initialProfile?.profile_photo_path || !supabase) return;
    let active = true;
    void supabase.storage
      .from("patient-profile-photos")
      .createSignedUrl(initialProfile.profile_photo_path, 3600)
      .then(({ data }) => {
        if (active && data?.signedUrl) setPhotoUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [initialProfile?.profile_photo_path, family]);

  async function pickPhoto() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSubmitError("Allow photo access to choose a profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) {
        setSubmitError("Choose a photo under 5 MB.");
        return;
      }
      if (asset.mimeType !== "image/jpeg" && asset.mimeType !== "image/png") {
        setSubmitError("Choose a JPG or PNG photo.");
        return;
      }
      setPhoto({ uri: asset.uri, mimeType: asset.mimeType });
      setPhotoUrl(asset.uri);
      setSubmitError("");
    } catch {
      setSubmitError("Could not select a photo. Try again.");
    }
  }

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: getInitialFormValues(
      initialProfile,
      family,
      initialEmail,
      initialPhone
    ),
  });

  useEffect(() => {
    if (initialProfile) {
      reset(
        getInitialFormValues(initialProfile, family, initialEmail, initialPhone)
      );
    } else if (!family && initialEmail) {
      setValue("email", initialEmail);
    }
    if (!initialProfile && !family && initialPhone) {
      setValue("phone", contactPhoneForInput(initialPhone));
    }
  }, [initialProfile, initialEmail, initialPhone, family, reset, setValue]);

  const onSubmit = async (values: ProfileFormValues) => {
    setSubmitError("");
    try {
      await onSave({
        ...formatProfilePayload(values, family),
        photo,
      });
    } catch (cause) {
      setSubmitError(
        cause instanceof Error ? cause.message : "Could not save the profile."
      );
    }
  };

  const displayError =
    submitError ||
    errors.fullName?.message ||
    errors.email?.message ||
    errors.dateOfBirth?.message ||
    errors.bloodGroup?.message ||
    errors.phone?.message ||
    errors.address?.message;
  useToastFeedback({ error: displayError });

  return {
    setSubmitError,
    photoUrl,
    pickPhoto,
    control,
    handleSubmit,
    errors,
    isSubmitting,
    onSubmit,
  };
}
