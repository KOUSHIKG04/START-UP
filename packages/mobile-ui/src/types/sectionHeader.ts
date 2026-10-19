import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import type { AppTheme } from "../utils/appTheme";

export interface SectionHeaderProps {
  theme?: AppTheme;
  title?: string;
  seeAllText?: string;
  onSeeAllPress?: () => void;
  showSeeAll?: boolean;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  seeAllTextStyle?: StyleProp<TextStyle>;
}
