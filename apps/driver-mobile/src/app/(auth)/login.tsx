import { router } from "expo-router";
import { DevPasswordForm, PhoneOtpForm } from "@startup/mobile-ui";
import { sendPhoneOtp, signInWithDevPassword, verifyPhoneOtp } from "@startup/data-access";
import { devPasswordLoginEnabled, mobileSession, supabase } from "../../services/supabase";

export default function LoginRoute() {
  async function finishSignIn() {
    await mobileSession.refresh();
    const profile = mobileSession.getSnapshot().profile;
    router.replace(profile?.driver ? "/(app)/(tabs)/home" : "/onboarding");
  }

  if (devPasswordLoginEnabled) {
    return (
      <DevPasswordForm
        title="Clinzo for drivers"
        configurationError={supabase ? null : mobileSession.getSnapshot().error}
        onSignIn={async (email, password) => {
          await signInWithDevPassword(supabase!, email, password);
          await finishSignIn();
        }}
      />
    );
  }

  return (
    <PhoneOtpForm
      title="Clinzo for drivers"
      description="Sign in or register with a code sent to your phone. Trip access begins after credential review."
      configurationError={supabase ? null : mobileSession.getSnapshot().error}
      onSend={(phone) => sendPhoneOtp(supabase!, phone)}
      onVerify={async (phone, code) => {
        await verifyPhoneOtp(supabase!, phone, code);
        await finishSignIn();
      }}
    />
  );
}
