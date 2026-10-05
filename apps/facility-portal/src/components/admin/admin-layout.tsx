"use client";

import * as React from "react";
import { AppSidebar } from "./app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@startup/web-ui/components/ui/sidebar";

export function AdminLayout({ children, facilityName, userName }: { children: React.ReactNode; facilityName: string; userName: string }) {
  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ "--sidebar-width": "195px" } as React.CSSProperties}
    >
      <div className="flex min-h-screen w-full bg-[#f8fafc]">
        <AppSidebar facilityName={facilityName} userName={userName} />
        <SidebarInset className="min-w-0 flex-1 bg-[#f8fafc] p-6 lg:p-8">
          <div className="mb-4 md:hidden">
            <SidebarTrigger />
          </div>
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
