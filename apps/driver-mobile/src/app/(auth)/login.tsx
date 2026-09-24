import { router } from "expo-router";
import { PhoneOtpForm } from "@startup/mobile-ui";
import { sendPhoneOtp, verifyPhoneOtp } from "@startup/data-access";
import { mobileSession, supabase } from "../../services/supabase";

export default function LoginRoute() {
  return (
    <PhoneOtpForm
      title="Clinzo for drivers"
      description="Sign in or register with a code sent to your phone. Trip access begins after credential review."
      configurationError={supabase ? null : mobileSession.getSnapshot().error}
      onSend={(phone) => sendPhoneOtp(supabase!, phone)}
      onVerify={async (phone, code) => {
        await verifyPhoneOtp(supabase!, phone, code);
        await mobileSession.refresh();
        const profile = mobileSession.getSnapshot().profile;
        router.replace(profile?.driver ? "/(app)/(tabs)/home" : "/onboarding");
      }}
    />
  );
}
