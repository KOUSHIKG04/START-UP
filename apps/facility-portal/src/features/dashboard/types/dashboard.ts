import type { ElementType } from "react";

export interface WardData {
  name: string;
  total: number;
  available: number;
  occupied: number;
  percent: number;
  icon: ElementType;
  iconBg: string;
  iconColor: string;
  progressColor: string;
}
