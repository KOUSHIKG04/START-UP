"use client";

import * as React from "react";
import { AppSidebar } from "./app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@startup/web-ui/components/ui/sidebar";

export function AdminLayout({
  children,
  facilityName,
  userName,
  logoutAction,
}: {
  children: React.ReactNode;
  facilityName: string;
  userName: string;
  logoutAction: React.ReactNode;
}) {
  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ "--sidebar-width": "195px" } as React.CSSProperties}
    >
      <div className="bg-background flex min-h-screen w-full">
        <AppSidebar
          facilityName={facilityName}
          userName={userName}
          logoutAction={logoutAction}
        />
        <SidebarInset className="bg-background min-w-0 flex-1 p-6 lg:p-8">
          <div className="mb-4 md:hidden">
            <SidebarTrigger />
          </div>
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
