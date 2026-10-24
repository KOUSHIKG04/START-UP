import { Building2, House, Video } from "lucide-react";

export const scheduleServices = [
  [
    "clinic",
    "Clinic appointments",
    "Manage visits at your clinic or hospital",
    Building2,
  ],
  ["home", "Home visits", "Manage home-visit times and travel radius", House],
  ["online", "Online consultations", "Manage video consultation times", Video],
] as const;
