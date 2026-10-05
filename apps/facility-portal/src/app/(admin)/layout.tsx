import type { ReactNode } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { requireApprovedFacility } from "@/server/auth/facilityAccess";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const access = await requireApprovedFacility();
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  return <AdminLayout facilityName={access.facilities[0]?.facilityName ?? "Facility"} userName={user?.email ?? "Facility account"}>{children}</AdminLayout>;
}
