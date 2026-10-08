import { router } from "expo-router";
import { completePatientProfile } from "@startup/data-access";
import { ProfileForm } from "../components/ProfileForm";
import { mobileSession, supabase, useMobileSession } from "../../../services/supabase";
import { savePatientProfilePhoto } from "../../../services/profile-photo";

export default function OnboardingScreen() {
  const { session } = useMobileSession();
  return <ProfileForm initialEmail={session?.user.email ?? ""} initialPhone={session?.user.phone ? "+" + session.user.phone.replace(/\D/g, "") : ""} onSave={async details => {
    if (!supabase) throw new Error("Supabase is not configured.");
    await completePatientProfile(supabase, { fullName: details.fullName, age: details.age, dateOfBirth: details.dateOfBirth, gender: details.gender as "Male" | "Female" | "Other" | "Prefer not to say", bloodGroup: details.bloodGroup as "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-", email: details.email, phone: details.phone, address: details.address });
    await savePatientProfilePhoto(details.photo);
    await mobileSession.refresh();
    router.replace("/(app)/family-profile");
  }} />;
}
