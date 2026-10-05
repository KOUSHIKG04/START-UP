import type { PublicPractice } from "@startup/contracts";

/** Discovery returns one row per published service; a doctor card represents a practice. */
export function uniqueDoctorPractices(practices: PublicPractice[], mode: "clinic" | "online" | "home"): PublicPractice[] {
  const byPractice = new Map<string, PublicPractice>();
  for (const practice of practices) {
    if (!practice.service_code.startsWith(`${mode}-`) || byPractice.has(practice.practice_id)) continue;
    byPractice.set(practice.practice_id, practice);
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
