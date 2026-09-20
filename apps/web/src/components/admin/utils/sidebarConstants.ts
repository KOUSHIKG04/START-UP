import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Clock,
  UserCheck,
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
];

export const sidebarBrand = {
  name: "MediCare Hospital",
  subtitle: "admin console",
} as const;
export const sidebarUser = {
  name: "Dr. Sarah Jenkins",
  role: "Chief Admin",
  initials: "SJ",
  avatar:
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120",
} as const;
