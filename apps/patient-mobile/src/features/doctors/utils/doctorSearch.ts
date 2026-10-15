import type { PublicPractice } from "@startup/contracts";

/** One doctor card per mode; keep all details from the same preferred practice. */
export function uniqueDoctorPractices(practices: PublicPractice[], mode: "clinic" | "online" | "home"): PublicPractice[] {
  const byPractice = new Map<string, PublicPractice>();
  for (const practice of practices) {
    if (!practice.service_code.startsWith(`${mode}-`)) continue;
    const previous = byPractice.get(practice.doctor_id);
    const nextTime = (item: PublicPractice) => item.next_available_at ? Date.parse(item.next_available_at) : Number.MAX_SAFE_INTEGER;
    const priority = previous ? Number(previous.has_available_slots) - Number(practice.has_available_slots)
      || nextTime(practice) - nextTime(previous)
      || (!practice.has_available_slots ? Number(previous.fee_minor !== null) - Number(practice.fee_minor !== null) : 0)
      || (practice.distance_meters ?? Number.MAX_SAFE_INTEGER) - (previous.distance_meters ?? Number.MAX_SAFE_INTEGER)
      || practice.practice_id.localeCompare(previous.practice_id) : -1;
    if (!previous || priority < 0) byPractice.set(practice.doctor_id, practice);
  }
  return [...byPractice.values()];
}

/** Preserve category labels while sending the correct query or specialty code to discovery. */
export function resolveDoctorSearch(term: string): { query?: string; specialtyCode?: string } {
  const normalized = term.trim().replace(/\s+/g, " ").toLowerCase();
  if (normalized === "your symptoms") return {};

  const symptomAlias: Record<string, string> = {
    "cold & cough": "Cough & Cold",
    "headache & migraine": "Headache",
    "breathing & lungs": "Breathing issue",
    "stomach & digestion": "Stomach Pain",
    "vertigo & balance": "Vertigo",
  };
  if (symptomAlias[normalized]) return { query: symptomAlias[normalized] };

  const categorySpecialty: Record<string, string> = {
    "dental care": "dentist",
    heart: "cardiologist",
    "bones, joints & muscles": "orthopedic",
    "spine & back care": "orthopedic",
    "brain & nervous system": "neurologist",
    "skin & hair": "dermatologist",
    "women's health": "gynecologist",
    "mental health": "psychiatrist",
    "ear, nose & throat": "ent_specialist",
    "children's health": "pediatrician",
    "constipation & bowel": "general_physician",
    "covid & viral care": "general_physician",
  };
  const specialtyCode = categorySpecialty[normalized];
  return specialtyCode ? { specialtyCode } : { query: term };
}
