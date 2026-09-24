"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type LoginState = { error: string | null };

export async function signIn(
  _previous: LoginState,
  formData: FormData
): Promise<LoginState> {
  if (!getSupabaseConfig()) {
    return { error: "Portal connection is not configured. Ask your administrator to set it up." };
  }
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" ||
      !email.includes("@") || !password) {
    return { error: "Enter a valid email address and password." };
  }

  const client = await createClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { error: "Sign-in failed. Check your credentials and try again." };
  redirect("/bed-management");
}

export async function signOut() {
  if (getSupabaseConfig()) {
    const client = await createClient();
    await client.auth.signOut();
  }
  redirect("/login");
}
