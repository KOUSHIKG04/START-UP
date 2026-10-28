import type { Ref } from "react";
import type { PullToRefreshProps } from "./pullToRefresh";
import type {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from "react-native";

export type FadedScrollViewProps = ScrollViewProps & {
  onRefresh?: PullToRefreshProps["onRefresh"];
  refreshTheme?: PullToRefreshProps["theme"];
  refreshOffset?: number;
  containerStyle?: StyleProp<ViewStyle>;
  edgeColor?: string;
  edgeSize?: number;
  topEdgeOffset?: number;
  ref?: Ref<ScrollView>;
};
