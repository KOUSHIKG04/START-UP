export { doctorLanguageName } from "@startup/contracts";

export function formatConsultationFee(minor: string, currency: string): string {
  const amount = Number(minor) / 100;
  if (!Number.isFinite(amount)) return "Fee unavailable";
  if (currency === "INR") return `₹${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}
