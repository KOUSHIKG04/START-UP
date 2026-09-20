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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@startup/web-ui/components/ui/avatar";

import { navItems, sidebarBrand, sidebarUser } from "./utils/sidebarConstants";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar
      className="border-r border-[#e2e8f0] bg-white text-[#0f172a] w-[195px]"
      {...props}
    >
      {/* Brand Header (Figma 809:12) */}
      <SidebarHeader className="px-3 py-3 pb-2">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-[16px] bg-[#07595d] flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105">
            <HeartPulse className="size-4.5 text-white stroke-[2.2]" />
          </div>
          <div className="flex flex-col leading-tight whitespace-nowrap">
            <span className="text-[14px] font-bold text-[#07595d] tracking-tight">
              {sidebarBrand.name}
            </span>
            <span className="text-[9px] font-semibold text-[#94a3b8] tracking-[0.5px] uppercase">
              {sidebarBrand.subtitle}
            </span>
          </div>
        </Link>
        <div className="mt-2.5 border-b border-[#e2e8f0] w-full" />
      </SidebarHeader>

      {/* Navigation Links */}
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
                  className={`h-auto px-2.5 py-2 rounded-lg text-[12.5px] transition-colors flex items-center gap-2.5 ${
                    isActive
                      ? "bg-[#e6f4f5] text-[#07595d] font-semibold hover:bg-[#d8eef0] hover:text-[#07595d]"
                      : "bg-transparent text-[#475569] font-medium hover:bg-slate-50 hover:text-[#0f172a]"
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

      {/* Bottom Admin User Card */}
      <SidebarFooter className="p-2.5 mt-auto">
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#f8fafc] border border-slate-100">
          <Avatar className="size-7 rounded-full border border-slate-200">
            <AvatarImage src={sidebarUser.avatar} alt={sidebarUser.name} />
            <AvatarFallback className="bg-[#07595d] text-white text-[11px] font-semibold">
              {sidebarUser.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-[12px] font-semibold text-[#0f172a] truncate">
              {sidebarUser.name}
            </span>
            <span className="text-[10px] text-[#475569] truncate">
              {sidebarUser.role}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
