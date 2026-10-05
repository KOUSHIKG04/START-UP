import { Building2, KeyRound, Users, Activity, Ambulance, Baby, XCircle } from "lucide-react";
import type { WardData } from "../types/dashboard";

// Visual styles only. Bed counts and labels come from facility inventory.
export const wards: Pick<WardData, "icon" | "iconBg" | "iconColor" | "progressColor">[] = [
  { icon: Building2, iconBg: "bg-blue-500/10", iconColor: "text-blue-600", progressColor: "bg-blue-500" },
  { icon: KeyRound, iconBg: "bg-[#07595d]/10", iconColor: "text-[#07595d]", progressColor: "bg-[#07595d]" },
  { icon: Users, iconBg: "bg-orange-500/10", iconColor: "text-orange-500", progressColor: "bg-orange-500" },
  { icon: Activity, iconBg: "bg-red-500/10", iconColor: "text-red-500", progressColor: "bg-red-500" },
  { icon: Activity, iconBg: "bg-slate-500/10", iconColor: "text-slate-600", progressColor: "bg-slate-500" },
  { icon: Ambulance, iconBg: "bg-amber-500/10", iconColor: "text-amber-500", progressColor: "bg-amber-500" },
  { icon: Baby, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500", progressColor: "bg-emerald-500" },
  { icon: XCircle, iconBg: "bg-purple-500/10", iconColor: "text-purple-500", progressColor: "bg-purple-500" },
];

export const scheduleDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
