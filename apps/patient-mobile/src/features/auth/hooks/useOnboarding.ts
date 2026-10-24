import type { ProfileDetails } from "../types/profile";
import { router } from "expo-router";
import { completePatientProfile } from "@startup/data-access";
import {
  mobileSession,
  supabase,
  useMobileSession,
} from "../../../services/supabase";
import { savePatientProfilePhoto } from "../../../services/profile-photo";

export function useOnboarding() {
  const { session } = useMobileSession();
  const saveProfile = async (details: ProfileDetails) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    await completePatientProfile(supabase, {
      fullName: details.fullName,
      age: details.age,
      dateOfBirth: details.dateOfBirth,
      gender: details.gender as
        "Male" | "Female" | "Other" | "Prefer not to say",
      bloodGroup: details.bloodGroup as
        "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-",
      email: details.email,
      phone: details.phone,
      address: details.address,
    });
    await savePatientProfilePhoto(details.photo);
    await mobileSession.refresh();
    router.replace("/(app)/family-profile");
  };

  return { session, saveProfile };
}
