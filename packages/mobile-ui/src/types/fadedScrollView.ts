import type { Ref } from "react";
import type {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from "react-native";

export type FadedScrollViewProps = ScrollViewProps & {
  containerStyle?: StyleProp<ViewStyle>;
  edgeColor?: string;
  edgeSize?: number;
  topEdgeOffset?: number;
  ref?: Ref<ScrollView>;
};
