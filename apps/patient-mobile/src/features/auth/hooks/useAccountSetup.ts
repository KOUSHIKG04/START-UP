import { useToast, useToastFeedback } from "@startup/mobile-ui";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { mobileSession, useMobileSession } from "../../../services/supabase";

export function useAccountSetup() {
  const auth = useMobileSession();
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { showToast } = useToast();
  useToastFeedback({ error });
  useEffect(() => {
    let active = true;
    setError("");
    setReady(false);
    Promise.resolve(mobileSession.refresh())
      .then(() => {
        if (!active) return;
        const { error: accountError } = mobileSession.getSnapshot();
        if (accountError) throw new Error(accountError);
        setReady(true);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load your account."
          );
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  useEffect(() => {
    if (auth.loading || auth.error || !auth.session) return;
    if (auth.profile?.patient_id && auth.profile.patient_profile_complete)
      router.replace("/(app)/(tabs)");
    else router.replace("/onboarding");
  }, [auth.loading, auth.error, auth.session?.user.id, auth.profile]);

  function openEmergency() {
    router.push("/onboarding-sos");
  }

  return {};
}
