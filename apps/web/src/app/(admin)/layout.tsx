import type { ReactNode } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function AdminRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!getSupabaseConfig()) redirect("/login");
  const client = await createClient();
  const { data, error } = await client.auth.getClaims();
  if (error || !data) redirect("/login");
  return <AdminLayout>{children}</AdminLayout>;
}
