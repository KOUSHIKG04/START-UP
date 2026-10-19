import {
  ClipboardCheck,
  LayoutDashboard,
  Stethoscope,
  Building2,
  Ambulance,
} from "lucide-react";
export const navigation = [
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
