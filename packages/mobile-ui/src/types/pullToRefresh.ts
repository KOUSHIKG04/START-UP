import type { AppTheme } from "../utils/appTheme";
import type { RefreshControlProps } from "react-native";

export type PullToRefreshProps = Pick<
  RefreshControlProps,
  "style" | "children"
> & {
  /** A group keeps the indicator active until every request has settled. */
  onRefresh: () => Promise<unknown> | readonly Promise<unknown>[];
  theme?: AppTheme;
  progressViewOffset?: number;
};
