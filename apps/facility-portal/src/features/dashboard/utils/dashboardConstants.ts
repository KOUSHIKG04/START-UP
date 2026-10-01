import {
  Building2,
  KeyRound,
  Users,
  Activity,
  Ambulance,
  Baby,
  XCircle,
} from "lucide-react";
import type { WardData } from "../types/dashboard";

// Static demo data, not live hospital state.
export const wards: WardData[] = [
  {
    name: "General Ward",
    total: 180,
    available: 48,
    occupied: 132,
    percent: 27,
    icon: Building2,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
    progressColor: "bg-blue-500",
  },
  {
    name: "Private Room",
    total: 70,
    available: 18,
    occupied: 52,
    percent: 26,
    icon: KeyRound,
    iconBg: "bg-[#07595d]/10",
    iconColor: "text-[#07595d]",
    progressColor: "bg-[#07595d]",
  },
  {
    name: "Semi-Private",
    total: 100,
    available: 32,
    occupied: 68,
    percent: 32,
    icon: Users,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    progressColor: "bg-orange-500",
  },
  {
    name: "ICU with ventilator",
    total: 50,
    available: 8,
    occupied: 42,
    percent: 16,
    icon: Activity,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    progressColor: "bg-red-500",
  },
  {
    name: "ICU without ventilator",
    total: 25,
    available: 4,
    occupied: 21,
    percent: 16,
    icon: Activity,
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-600",
    progressColor: "bg-slate-500",
  },
  {
    name: "Emergency",
    total: 40,
    available: 12,
    occupied: 28,
    percent: 30,
    icon: Ambulance,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    progressColor: "bg-amber-500",
  },
  {
    name: "NICU (Neonatal)",
    total: 30,
    available: 6,
    occupied: 24,
    percent: 20,
    icon: Baby,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    progressColor: "bg-emerald-500",
  },
  {
    name: "PICU (h)",
    total: 25,
    available: 5,
    occupied: 20,
    percent: 20,
    icon: XCircle,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    progressColor: "bg-purple-500",
  },
];

export const doctors = [
  {
    name: "Dr. Priya Sharma",
    speciality: "Cardiology",
    days: [true, true, true, true, true, false, true],
  },
  {
    name: "Dr. Rajesh Kumar",
    speciality: "Neurology",
    days: [true, true, true, true, true, false, true],
  },
  {
    name: "Dr. Suresh Babu",
    speciality: "General Medicine",
    days: [true, true, true, true, true, false, true],
  },
  {
    name: "Dr. Arjun Mehta",
    speciality: "Pediatrics",
    days: [true, true, true, true, true, false, true],
  },
  {
    name: "Dr. Karthik Raman",
    speciality: "Orthopedics",
    days: [true, true, true, true, true, false, true],
  },
];

export const dashboardDateLabel = "Nov 15, 2026";
export const dashboardCapacityLabel = "TOTAL CAPACITY: 520 BEDS";
export const scheduleDays = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
export const pendingRequests = [
  {
    patient: "Patient #Anush",
    consultation: "Cardiology Consultation",
    time: "Today, 11:30 AM",
    requested: "Requested 20m ago",
  },
  {
    patient: "Patient #Nandan",
    consultation: "Pediatric Checkup",
    time: "Tomorrow, 09:15 AM",
    requested: "Requested 1h ago",
  },
] as const;
