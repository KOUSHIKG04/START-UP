import { useEffect, useRef, useState } from "react";
import { RefreshControl } from "react-native";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import { useToast } from "./Toast";
import type { PullToRefreshProps } from "../types/pullToRefresh";

export type { PullToRefreshProps } from "../types/pullToRefresh";

export function PullToRefresh({
  onRefresh,
  theme,
  progressViewOffset,
  style,
  children,
}: PullToRefreshProps) {
  const colors = useMobileTheme(theme);
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function refresh() {
    if (running.current) return;
    running.current = true;
    setRefreshing(true);
    try {
      const requests = onRefresh();
      const results = await Promise.allSettled(
        Array.isArray(requests) ? requests : [requests]
      );
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
    } catch {
      if (mounted.current)
        showToast({
          title: "Could not refresh",
          message: "Check your connection and pull down to try again.",
          type: "error",
        });
    } finally {
      running.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }
  return (
    <RefreshControl
      style={style}
      accessibilityLabel="Refresh content"
      accessibilityState={{ busy: refreshing }}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.surface}
      progressViewOffset={progressViewOffset}
    >
      {children}
    </RefreshControl>
  );
}
