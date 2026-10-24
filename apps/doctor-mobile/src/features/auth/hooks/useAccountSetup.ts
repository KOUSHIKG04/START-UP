import { useToastFeedback } from "@startup/mobile-ui";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { mobileSession, useMobileSession } from "../../../services/supabase";

export function useAccountSetup() {
  const auth = useMobileSession();
  const [error, setError] = useState("");
  useToastFeedback({ error });
  useEffect(() => {
    let active = true;
    void mobileSession
      .refresh()
      .then(() => {
        if (active) setError(mobileSession.getSnapshot().error ?? "");
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
  }, []);
  useEffect(() => {
    if (auth.loading || auth.error || !auth.session) return;
    router.replace(
      auth.profile?.doctor?.status === "verified"
        ? "/(app)"
        : auth.profile?.doctor
          ? "/review-status"
          : "/onboarding"
    );
  }, [auth.loading, auth.error, auth.session?.user.id, auth.profile]);

  return {};
}
