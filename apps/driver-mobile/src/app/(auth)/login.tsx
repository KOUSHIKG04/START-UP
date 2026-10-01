import { router } from "expo-router";
import { DevPasswordForm, PhoneOtpForm } from "@startup/mobile-ui";
import {
  sendPhoneOtp,
  signInWithDevPassword,
  signUpWithDevPassword,
  verifyPhoneOtp,
} from "@startup/data-access";
import {
  devPasswordLoginEnabled,
  mobileSession,
  supabase,
} from "../../services/supabase";

export default function LoginRoute() {
  async function finishSignIn() {
    await mobileSession.refresh();
    router.replace(
      mobileSession.getSnapshot().profile?.driver ? "/(app)" : "/onboarding"
    );
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
        onSignUp={async (email, password) => {
          const session = await signUpWithDevPassword(
            supabase!,
            email,
            password
          );
          if (session) await finishSignIn();
          return Boolean(session);
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
