import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Clock,
  UserCheck,
  FileCheck2,
} from "lucide-react";

// Navigation items configured strictly per Figma & user requirements:
// Patients, Departments, Reports & Logs are intentionally omitted.
export const navItems = [
  {
    title: "Dashboard",
    url: "/",
    matchUrls: ["/", "/dashboard"],
    icon: LayoutDashboard,
  },
  {
    title: "Bed Management",
    url: "/bed-management",
    matchUrls: ["/bed-management"],
    icon: Building2,
  },
  {
    title: "Doctor Schedules",
    url: "/doctor-schedules",
    matchUrls: ["/doctor-schedules"],
    icon: CalendarDays,
  },
  {
    title: "Appointments",
    url: "/appointments",
    matchUrls: ["/appointments"],
    icon: Clock,
  },
  {
    title: "Doctor Management",
    url: "/doctor-management",
    matchUrls: ["/doctor-management"],
    icon: UserCheck,
  },
  {
    title: "Facility Verification",
    url: "/facility-verification",
    matchUrls: ["/facility-verification"],
    icon: FileCheck2,
  },
];
