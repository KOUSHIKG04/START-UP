import { useToastFeedback } from "@startup/mobile-ui";
import { useEffect, useRef, useState } from "react";
import { TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { sendPhoneOtp, verifyPhoneOtp } from "@startup/data-access";
import { supabase } from "../../../services/supabase";

export function useVerifyOtp() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useToastFeedback({ error });
  const input = useRef<TextInput>(null);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  async function verify(value: string) {
    if (!supabase || !phone || value.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      await verifyPhoneOtp(supabase, phone, value);
      router.replace("/setup");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Incorrect code. Try again."
      );
      setCode("");
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (!supabase || !phone || seconds > 0 || busy || resending) return;
    setResending(true);
    try {
      await sendPhoneOtp(supabase, phone);
      setSeconds(30);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not resend the code."
      );
    } finally {
      setResending(false);
    }
  }

  return {
    phone,
    code,
    setCode,
    resending,
    seconds,
    busy,
    input,
    verify,
    resend,
  };
}
