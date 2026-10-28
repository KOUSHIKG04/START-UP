import {
  ClipboardCheck,
  LayoutDashboard,
  Stethoscope,
  Building2,
  Ambulance,
  IndianRupee,
} from "lucide-react";

export const navigation = [
  { href: "/payments", label: "Payments & payouts", Icon: IndianRupee },
  { href: "/", label: "Overview", Icon: LayoutDashboard },
  { href: "/verification", label: "All reviews", Icon: ClipboardCheck },
  { href: "/verification?type=doctor", label: "Doctors", Icon: Stethoscope },
  {
    href: "/verification?type=facility",
    label: "Hospitals & clinics",
    Icon: Building2,
  },
  {
    href: "/verification?type=driver",
    label: "Ambulance drivers",
    Icon: Ambulance,
  },
];
