import { Frown, Heart, Meh, Smile, SmilePlus } from "lucide-react-native";

export const experienceRatings = [
  { icon: Frown, label: "Very poor" },
  { icon: Meh, label: "Okay" },
  { icon: Smile, label: "Good" },
  { icon: SmilePlus, label: "Great" },
  { icon: Heart, label: "Excellent" },
] as const;
