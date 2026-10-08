import { useCallback, useRef } from "react";
import { setStatusBarStyle } from "expo-status-bar";
import { uploadPatientProfilePhoto } from "../../../services/profile-photo";
import { router, useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { addMyFamilyProfile } from "@startup/data-access";
import { ProfileForm } from "../components/ProfileForm";
import { supabase } from "../../../services/supabase";

export default function FamilyProfileScreen() {
  useFocusEffect(useCallback(() => {
    setStatusBarStyle("dark");
    return () => setStatusBarStyle("light");
  }, []));
  const uploaded = useRef<{uri: string; path: string} | undefined>(undefined);
  const queryClient = useQueryClient();

  return (
    <ProfileForm
      family
      onSave={async (details) => {
        if (!supabase || !details.relation || !details.phone) {
          throw new Error("Family profile is incomplete.");
        }
        if (details.photo && uploaded.current?.uri !== details.photo.uri) {
          const path = await uploadPatientProfilePhoto(details.photo);
          if (path) uploaded.current = {uri: details.photo.uri, path};
        }
        await addMyFamilyProfile(supabase, {
          fullName: details.fullName,
          age: details.age,
          dateOfBirth: details.dateOfBirth,
          gender: details.gender as
            | "Male"
            | "Female"
            | "Other"
            | "Prefer not to say",
          bloodGroup: details.bloodGroup as
            | "A+"
            | "A-"
            | "B+"
            | "B-"
            | "O+"
            | "O-"
            | "AB+"
            | "AB-",
          relation: details.relation as
            | "Son"
            | "Daughter"
            | "Father"
            | "Mother"
            | "Spouse"
            | "Sibling"
            | "Other",
          phone: details.phone,
          notify: Boolean(details.notify),
          profilePhotoPath: uploaded.current?.path,
        });
        await queryClient.invalidateQueries({
          queryKey: ["my-family-profiles"],
        });
        router.back();
      }}
    />
  );
}
