import { labels, styles } from "../utils/verificationStatusConstants";
import type { StatusBadgeProps } from "../types/status-badge";

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
