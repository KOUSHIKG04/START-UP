/** Dates shown or entered by people use DD-MM-YYYY; APIs continue to use ISO dates. */
export function parseDisplayDate(value: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() + 1 !== Number(month) || date.getUTCDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(value: Date | string, timeZone?: string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value.slice(8, 10)}-${value.slice(5, 7)}-${value.slice(0, 4)}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  if (timeZone) {
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone }).format(date).replaceAll("/", "-");
  }
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

export function formatDisplayDateTime(value: Date | string, timeZone?: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDisplayDate(date, timeZone)} ${new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone }).format(date)}`;
}
