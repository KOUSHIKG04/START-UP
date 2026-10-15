export { doctorLanguageName } from "@startup/contracts";
import type { PublicPractice } from "@startup/contracts";

export function practiceAvailabilityLabel(
  practice: PublicPractice,
  includeLocation = true,
  now = new Date()
): string {
  const location = includeLocation ? ` · ${practice.facility_name}` : "";
  if (!practice.has_available_slots || !practice.next_available_at)
    return `No appointments available${location}`;
  const next = new Date(practice.next_available_at);
  const date = new Intl.DateTimeFormat("en-IN", {
    timeZone: practice.timezone,
    day: "numeric",
    month: "short",
  });
  const day =
    date.format(next) === date.format(now) &&
    next.getFullYear() === now.getFullYear()
      ? "Today"
      : date.format(next);
  const time = new Intl.DateTimeFormat("en-IN", {
    timeZone: practice.timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(next);
  return `${day}, ${time}${location}`;
}

export function formatConsultationFee(
  minor: string | null,
  currency: string
): string {
  if (minor === null) return "Fee not published";
  const amount = Number(minor) / 100;
  if (!Number.isFinite(amount)) return "Fee unavailable";
  if (currency === "INR")
    return `₹${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(
    amount
  );
}
