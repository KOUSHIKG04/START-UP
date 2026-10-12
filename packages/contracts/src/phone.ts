/** Contact numbers are persisted in E.164; local ten-digit input defaults to India. */
export function normalizeContactPhone(value: string): string | null {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  if (/^91\d{10}$/.test(compact)) return `+${compact}`;
  if (/^\d{10}$/.test(compact)) return `+91${compact}`;
  return null;
}

/** Show the local part for India; retain explicit country codes for other countries. */
export function contactPhoneForInput(value: string): string {
  const normalized = normalizeContactPhone(value);
  if (!normalized) return value;
  return /^\+91\d{10}$/.test(normalized) ? normalized.slice(3) : normalized;
}
