"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "cn";

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

export function VirtualList<T>({
  items,
  estimateSize = 56,
  overscan = 5,
  height = 400,
  className,
  renderItem,
  emptyState,
  emptyMessage = "No items to display.",
  getItemKey,
}: VirtualListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey,
  });

  if (items.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <div className="flex h-36 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white p-6 text-[13px] text-[#64748b]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn(
        "relative w-full overflow-auto rounded-xl border border-[#e2e8f0] bg-white shadow-2xs",
        className,
      )}
      style={{ height }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
