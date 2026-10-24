import type { ImageSourcePropType } from "react-native";
import type { AppTheme } from "../utils/appTheme";

export type ProfilePhotoButtonProps = {
  source?: ImageSourcePropType;
  onPress?: () => void;
  theme?: AppTheme;
  size?: number;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
};
