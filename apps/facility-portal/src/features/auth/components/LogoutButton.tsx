"use client";
import { useLogout } from "../hooks/useLogout";

import { LoaderCircle, LogOut } from "lucide-react";
import { SidebarMenuButton } from "@startup/web-ui/components/ui/sidebar";

export function LogoutButton() {
  const { action, pending } = useLogout();
  return (
    <form action={action}>
      <SidebarMenuButton
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="h-auto gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-[#475569] hover:bg-slate-50 hover:text-[#0f172a]"
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <LogOut className="size-4" />
        )}
        <span>{pending ? "Logging out…" : "Logout"}</span>
      </SidebarMenuButton>
    </form>
  );
}
