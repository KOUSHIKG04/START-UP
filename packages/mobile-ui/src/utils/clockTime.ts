export const pad = (n: number) => String(n).padStart(2, "0");

export function display(value: string) {
  if (!value) return "Select time";
  if (value === "24:00") return "12:00 AM";
  const [h, m] = value.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}
