import type { StyleProp, ViewStyle } from "react-native";
export type DoctorCardProps = {
  name: string;
  qualification: string;
  specialty: string;
  experience: string;
  rating?: string;
  showRating?: boolean;
  fee?: string;
  distanceMeters?: number | null;
  hideFee?: boolean;
  hideExperience?: boolean;
  onPress?: () => void;
  showChevron?: boolean;
  contextLabel?: string;
  variant?: "default" | "profile" | "detail";
  style?: StyleProp<ViewStyle>;
};
