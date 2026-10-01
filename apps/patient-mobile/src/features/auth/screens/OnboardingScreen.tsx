import { router } from "expo-router";
import { completePatientProfile } from "@startup/data-access";
import { ProfileForm } from "../components/ProfileForm";
import { mobileSession, supabase, useMobileSession } from "../../../services/supabase";

export default function OnboardingScreen() {
  const { session } = useMobileSession();
  return <ProfileForm initialEmail={session?.user.email ?? ""} onSave={async details => {
    if (!supabase) throw new Error("Supabase is not configured.");
    await completePatientProfile(supabase, { fullName: details.fullName, age: details.age, gender: details.gender as "Male" | "Female" | "Other" | "Prefer not to say", bloodGroup: details.bloodGroup as "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-", email: details.email, address: details.address });
    await mobileSession.refresh();
    router.replace("/(app)/family-profile");
  }} />;
}
