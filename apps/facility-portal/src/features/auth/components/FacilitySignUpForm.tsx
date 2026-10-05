"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@startup/web-ui/components/ui/button";
import { Card, CardContent } from "@startup/web-ui/components/ui/card";
import { Input } from "@startup/web-ui/components/ui/input";
import { Label } from "@startup/web-ui/components/ui/label";

export function FacilitySignUpForm() {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const { error } = await createBrowserSupabaseClient().auth.signUp({ email:email.trim(),password });
      if (error?.code === "email_address_invalid") {
        throw new Error("Use a real email inbox. Supabase does not accept example.com or other test domains for signup.");
      }
      if (error?.code === "email_address_not_authorized") {
        throw new Error("This Supabase project can only email its team members until custom SMTP is configured. Use a team email for testing.");
      }
      if (error) throw error;
      setMessage("Check your email to confirm this account, then sign in and register your facility.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Sign-up failed."); }
    finally { setBusy(false); }
  }
  return <Card className="w-full max-w-md"><CardContent className="space-y-5 p-6"><h1 className="text-2xl font-bold">Facility account</h1><p className="text-sm text-muted-foreground">Create an account to register a hospital or clinic for company review.</p><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="register-email">Email</Label><Input id="register-email" type="email" autoComplete="email" placeholder="name@yourclinic.com" value={email} onChange={event=>setEmail(event.target.value)} required /><p className="text-muted-foreground text-xs">Use an inbox you can open to confirm this account.</p></div><div className="space-y-2"><Label htmlFor="register-password">Password</Label><Input id="register-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={event=>setPassword(event.target.value)} required /></div><Button disabled={busy}>{busy ? "Creating…" : "Create account"}</Button></form>{message && <p role="status" className="text-sm">{message}</p>}<Link href="/login" className="text-sm underline">Back to sign in</Link></CardContent></Card>;
}
