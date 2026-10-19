"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartPulse } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@startup/web-ui/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@startup/web-ui/components/ui/avatar";

import { navItems } from "./utils/sidebarConstants";

export function AppSidebar({
  facilityName,
  userName,
  logoutAction,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  facilityName: string;
  userName: string;
  logoutAction: React.ReactNode;
}) {
  const pathname = usePathname();
  const initials = userName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar
      className="border-border bg-card text-foreground w-(--sidebar-width) border-r"
      {...props}
    >
      <SidebarHeader className="px-3 py-3 pb-2">
        <Link href="/" className="group flex items-center gap-2">
          <div className="bg-primary flex size-8 shrink-0 items-center justify-center rounded-lg shadow-xs transition-transform group-hover:scale-105">
            <HeartPulse className="text-primary-foreground size-4.5 stroke-2" />
          </div>
          <div className="flex flex-col leading-tight whitespace-nowrap">
            <span className="text-primary text-sm font-bold tracking-tight">
              {facilityName}
            </span>
            <span className="text-muted-foreground text-xs font-semibold tracking-normal uppercase">
              admin console
            </span>
          </div>
        </Link>
        <div className="border-border mt-2.5 w-full border-b" />
      </SidebarHeader>

      <SidebarContent className="px-2 py-1.5">
        <SidebarMenu className="gap-0.5">
          {navItems.map((item) => {
            const isActive =
              item.matchUrls.includes(pathname) ||
              (item.url !== "/" && pathname.startsWith(item.url));
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={`flex h-auto items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                    isActive
                      ? "bg-muted text-primary hover:bg-primary/10 hover:text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground bg-transparent font-medium"
                  }`}
                >
                  <Link href={item.url}>
                    <Icon
                      className={`size-4 shrink-0 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto p-2.5">
        <SidebarMenu>
          <SidebarMenuItem>{logoutAction}</SidebarMenuItem>
        </SidebarMenu>
        <div className="border-border bg-background flex items-center gap-2.5 rounded-lg border p-2">
          <Avatar className="border-border size-7 rounded-full border">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-foreground truncate text-xs font-semibold">
              {userName}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              Facility admin
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
