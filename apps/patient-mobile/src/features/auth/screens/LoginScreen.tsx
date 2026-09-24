import { router } from "expo-router";
import { Linking } from "react-native";
import { Button, DevPasswordForm, PhoneOtpForm } from "@startup/mobile-ui";
import { sendPhoneOtp, signInWithDevPassword, verifyPhoneOtp } from "@startup/data-access";
import { devPasswordLoginEnabled, mobileSession, supabase } from "../../../services/supabase";

export default function LoginScreen() {
  async function finishSignIn() {
    await mobileSession.refresh();
    const profile = mobileSession.getSnapshot().profile;
    router.replace(profile?.patient_id ? "/(app)/(tabs)" : "/onboarding");
  }

  if (devPasswordLoginEnabled) {
    return (
      <DevPasswordForm
        title="Welcome to Clinzo"
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
      title="Welcome to Clinzo"
      description="Sign in or create your patient account with a code sent to your phone. This code is separate from any trip or home-visit completion PIN."
      footer={
        <Button
          label="Emergency? Call 112"
          variant="outline"
          onPress={() => void Linking.openURL("tel:112")}
        />
      }
      configurationError={supabase ? null : mobileSession.getSnapshot().error}
      onSend={(phone) => sendPhoneOtp(supabase!, phone)}
      onVerify={async (phone, code) => {
        await verifyPhoneOtp(supabase!, phone, code);
        await finishSignIn();
      }}
    />
  );
}
