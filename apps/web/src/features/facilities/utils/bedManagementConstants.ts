import type { DeptBedData } from "../types/bedManagement";

// Demo data only; these values are not loaded from a backend.
export const initialDepts: DeptBedData[] = [
  {
    id: "gen",
    name: "General Ward",
    dotColor: "bg-[#22c55e]",
    barColor: "bg-[#22c55e]",
    total: 120,
    available: 32,
    occupied: 84,
  },
  {
    id: "priv",
    name: "Private Room",
    dotColor: "bg-[#3b82f6]",
    barColor: "bg-[#3b82f6]",
    total: 90,
    available: 28,
    occupied: 59,
  },
  {
    id: "semi",
    name: "Semi-Private",
    dotColor: "bg-[#8b5cf6]",
    barColor: "bg-[#8b5cf6]",
    total: 60,
    available: 18,
    occupied: 40,
  },
  {
    id: "icu-v",
    name: "ICU with ventilator",
    dotColor: "bg-[#ef4444]",
    barColor: "bg-[#ef4444]",
    total: 50,
    available: 12,
    occupied: 35,
  },
  {
    id: "icu-nv",
    name: "ICU without ventilator",
    dotColor: "bg-[#f59e0b]",
    barColor: "bg-[#f59e0b]",
    total: 45,
    available: 10,
    occupied: 32,
  },
  {
    id: "emer",
    name: "Emergency",
    dotColor: "bg-[#06b6d4]",
    barColor: "bg-[#06b6d4]",
    total: 40,
    available: 14,
    occupied: 24,
  },
  {
    id: "nicu",
    name: "NICU (Neonatal)",
    dotColor: "bg-[#8b5cf6]",
    barColor: "bg-[#8b5cf6]",
    total: 35,
    available: 7,
    occupied: 26,
  },
  {
    id: "picu",
    name: "PICU (Pediatric)",
    dotColor: "bg-[#8b5cf6]",
    barColor: "bg-[#8b5cf6]",
    total: 35,
    available: 7,
    occupied: 26,
  },
];
export const bedManagementDateLabel = "Nov 15, 2024";

export const bedsUnderMaintenance = 7;
