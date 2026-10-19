import { useOnboarding } from "../hooks/useOnboarding";

import { ProfileForm } from "../components/ProfileForm";

export default function OnboardingScreen() {
  const { session, saveProfile } = useOnboarding();
  return (
    <ProfileForm
      initialEmail={session?.user.email ?? ""}
      initialPhone={
        session?.user.phone ? "+" + session.user.phone.replace(/\D/g, "") : ""
      }
      onSave={saveProfile}
    />
  );
}
