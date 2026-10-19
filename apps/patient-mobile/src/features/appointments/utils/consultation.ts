import type { ConsultationType } from "../types/appointment";
export function parseConsultationType(
  value?: string | string[]
): ConsultationType {
  const resolved = Array.isArray(value) ? value[0] : value;
  if (resolved === "Home Visit" || resolved === "Online") return resolved;
  return "Clinic Visit";
}
