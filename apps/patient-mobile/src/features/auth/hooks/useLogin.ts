import { useToastFeedback } from "@startup/mobile-ui";
import { useState } from "react";
import { router } from "expo-router";
import {
  signInWithDevPassword,
  signUpWithDevPassword,
} from "@startup/data-access";
import { supabase } from "../../../services/supabase";

export function useLogin() {
  const [mode, setMode] = useState<"dev" | "prod">("dev");
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useToastFeedback({ error });

  async function signIn() {
    if (!supabase) {
      setError("Supabase is not configured on this device.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signInWithDevPassword(supabase, email, password);
      router.replace("/setup");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function signUp() {
    if (!supabase) {
      setError("Supabase is not configured on this device.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 12) {
      setError("Use a password with at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const session = await signUpWithDevPassword(supabase, email, password);
      if (session) router.replace("/setup");
      else setConfirmationPending(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create your account."
      );
    } finally {
      setBusy(false);
    }
  }

  function switchEmailMode() {
    setEmailMode(emailMode === "signin" ? "signup" : "signin");
    setError("");
    setConfirmPassword("");
    setConfirmationPending(false);
  }

  async function continueWithGoogle() {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) throw error;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Google sign-in is not configured yet on this development project."
      );
    }
  }

  return {
    mode,
    setMode,
    emailMode,
    setEmailMode,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    confirmationPending,
    setConfirmationPending,
    busy,
    setError,
    signIn,
    signUp,
    switchEmailMode,
    continueWithGoogle,
  };
}
