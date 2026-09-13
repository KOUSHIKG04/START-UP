import {
  House,
  MessageCircle,
  Microscope,
  Stethoscope,
} from "lucide-react-native";
import { type IconLabelIconProps } from "@startup/mobile-ui";

export const homeActions = [
  {
    key: "doctor",
    label: "Doctor\nAppointment",
    icon: ({ color, size }: IconLabelIconProps) => (
      <Stethoscope color={color} size={size} strokeWidth={1.8} />
    ),
  },
  {
    key: "home",
    label: "Home\nAppointment",
    icon: ({ color, size }: IconLabelIconProps) => (
      <House color={color} size={size} strokeWidth={1.8} />
    ),
  },
  {
    key: "lab",
    label: "Lab Tests",
    icon: ({ color, size }: IconLabelIconProps) => (
      <Microscope color={color} size={size} strokeWidth={1.8} />
    ),
  },
  {
    key: "consultation",
    label: "Online\nConsultation",
    icon: ({ color, size }: IconLabelIconProps) => (
      <MessageCircle color={color} size={size} strokeWidth={1.8} />
    ),
  },
] as const;
