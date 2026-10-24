import type { HomeAction } from "../types/home";

export type { HomeAction } from "../types/home";

import {
  House,
  MessageCircle,
  Microscope,
  Stethoscope,
} from "lucide-react-native";
import type { IconLabelIconProps } from "@startup/mobile-ui";

export const homeActions: readonly HomeAction[] = [
  {
    key: "doctor",
    label: "Doctor\nAppointment",
    consultationType: "Clinic Visit",
    icon: ({ color, size }: IconLabelIconProps) => (
      <Stethoscope color={color} size={size} strokeWidth={1.8} />
    ),
  },
  {
    key: "home",
    label: "Home\nAppointment",
    consultationType: "Home Visit",
    icon: ({ color, size }: IconLabelIconProps) => (
      <House color={color} size={size} strokeWidth={1.8} />
    ),
  },
  {
    key: "consultation",
    label: "Online\nConsultation",
    consultationType: "Online",
    icon: ({ color, size }: IconLabelIconProps) => (
      <MessageCircle color={color} size={size} strokeWidth={1.8} />
    ),
  },
  {
    key: "lab",
    label: "Book\nLab Tests",
    icon: ({ color, size }: IconLabelIconProps) => (
      <Microscope color={color} size={size} strokeWidth={1.8} />
    ),
  },
];
