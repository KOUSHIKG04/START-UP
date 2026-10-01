"use server";

import { redirect } from "next/navigation";
import { createClient } from "./supabase";

export async function signIn(_state: { error: string | null }, form: FormData) {
  const email = form.get("email");
  const password = form.get("password");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.includes("@") ||
    !password
  ) {
    return { error: "Enter your email address and password." };
  }
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return { error: "Company Admin is not configured yet." };
  }

  const client = await createClient();
  
  const { error } = await client.auth.signInWithPassword({ email, password });
  
  if (error) return { error: "Sign-in failed. Check your credentials." };
  
  const { data } = await client.rpc("is_company_reviewer");
  
  if (data !== true) {
    await client.auth.signOut();
    return { error: "This account is not a company reviewer." };
  }
  
  redirect("/verification");
}

export async function signOut() {
  const client = await createClient();
  await client.auth.signOut();
  redirect("/login");
}
