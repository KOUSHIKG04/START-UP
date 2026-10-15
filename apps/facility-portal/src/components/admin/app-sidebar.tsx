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
import { LogoutButton } from "@/features/auth";

export function AppSidebar({
  facilityName,
  userName,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  facilityName: string;
  userName: string;
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
      className="w-[195px] border-r border-[#e2e8f0] bg-white text-[#0f172a]"
      {...props}
    >
      <SidebarHeader className="px-3 py-3 pb-2">
        <Link href="/" className="group flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[16px] bg-[#07595d] shadow-xs transition-transform group-hover:scale-105">
            <HeartPulse className="size-4.5 stroke-[2.2] text-white" />
          </div>
          <div className="flex flex-col leading-tight whitespace-nowrap">
            <span className="text-[14px] font-bold tracking-tight text-[#07595d]">
              {facilityName}
            </span>
            <span className="text-[9px] font-semibold tracking-[0.5px] text-[#94a3b8] uppercase">
              admin console
            </span>
          </div>
        </Link>
        <div className="mt-2.5 w-full border-b border-[#e2e8f0]" />
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
                  className={`flex h-auto items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition-colors ${
                    isActive
                      ? "bg-[#e6f4f5] font-semibold text-[#07595d] hover:bg-[#d8eef0] hover:text-[#07595d]"
                      : "bg-transparent font-medium text-[#475569] hover:bg-slate-50 hover:text-[#0f172a]"
                  }`}
                >
                  <Link href={item.url}>
                    <Icon
                      className={`size-4 shrink-0 ${
                        isActive ? "text-[#07595d]" : "text-[#475569]"
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
          <SidebarMenuItem>
            <LogoutButton />
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-[#f8fafc] p-2">
          <Avatar className="size-7 rounded-full border border-slate-200">
            <AvatarFallback className="bg-[#07595d] text-[11px] font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[12px] font-semibold text-[#0f172a]">
              {userName}
            </span>
            <span className="truncate text-[10px] text-[#475569]">
              Facility admin
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
