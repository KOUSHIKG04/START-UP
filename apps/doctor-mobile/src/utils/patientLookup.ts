import { patients } from "../data/demo";
export function lookupPatient(value: string) {
  const clean = value.trim();
  let id = clean;
  if (clean.startsWith("{")) {
    try {
      const parsed = JSON.parse(clean);
      id = typeof parsed?.patientId === "string" ? parsed.patientId : "";
    } catch {
      return undefined;
    }
  }
  return patients.find(
    (patient) => patient.id.toLowerCase() === id.toLowerCase()
  );
}
