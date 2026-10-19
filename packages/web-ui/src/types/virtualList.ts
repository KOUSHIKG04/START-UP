import type * as React from "react";

export interface VirtualListProps<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  height?: number | string;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  emptyMessage?: string;
  getItemKey?: (index: number) => React.Key;
}
