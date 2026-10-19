import { formatDisplayDate } from "./dates";

/** Relative notification copy; older and future timestamps use a display date. */
export function notificationTime(createdAt: string, now = Date.now()): string {
  const elapsed = now - new Date(createdAt).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0)
    return formatDisplayDate(createdAt);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : formatDisplayDate(createdAt);
}
