import { useToastFeedback } from "@startup/mobile-ui";
import { useState } from "react";
import { router } from "expo-router";
import { sendPhoneOtp } from "@startup/data-access";
import { supabase } from "../../../services/supabase";
export function usePhoneSignIn() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useToastFeedback({ error });

  async function submit() {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const number = `+91${phone.replace(/\D/g, "")}`;
      await sendPhoneOtp(supabase, number);
      router.push({ pathname: "/verify-otp", params: { phone: number } });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send the code."
      );
    } finally {
      setBusy(false);
    }
  }

  return { phone, setPhone, busy, submit };
}
