"use client";
import { useState, type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
export function useFacilitySignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await createBrowserSupabaseClient().auth.signUp({
        email: email.trim(),
        password,
      });
      if (error?.code === "email_address_invalid") {
        throw new Error(
          "Use a real email inbox. Supabase does not accept example.com or other test domains for signup."
        );
      }
      if (error?.code === "email_address_not_authorized") {
        throw new Error(
          "This Supabase project can only email its team members until custom SMTP is configured. Use a team email for testing."
        );
      }
      if (error) throw error;
      setMessage(
        "Check your email to confirm this account, then sign in and register your facility."
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Sign-up failed.");
    } finally {
      setBusy(false);
    }
  }

  return { email, setEmail, password, setPassword, message, busy, submit };
}
