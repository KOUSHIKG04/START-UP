import "server-only";
import { redirect } from "next/navigation";
import { isCompanyReviewer } from "@startup/data-access";
import { createClient } from "./supabase";

export async function requireReviewer() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    redirect("/login?error=config");
  }

  const client = await createClient();
  const { data, error } = await client.auth.getClaims();
  
  if (error || !data) redirect("/login");
  
  if (!(await isCompanyReviewer(client))) redirect("/login?error=access");
  
  return client;
}
