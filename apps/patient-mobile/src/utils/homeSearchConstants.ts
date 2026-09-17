import type { Href } from "expo-router";

export type SearchItem = {
  id: string;
  title: string;
  type: "Speciality" | "Symptom";
};

export const DEFAULT_SEARCH_CITY = "Bangalore";

export const INITIAL_RECENTS: readonly SearchItem[] = [
  { id: "rec-1", title: "General Physician", type: "Speciality" },
  { id: "rec-2", title: "Dermatologist", type: "Speciality" },
  { id: "rec-3", title: "Fever", type: "Symptom" },
] as const;

export const POPULAR_SEARCHES: readonly SearchItem[] = [
  { id: "pop-1", title: "Cardiologist", type: "Speciality" },
  { id: "pop-2", title: "Pediatrician", type: "Speciality" },
  { id: "pop-3", title: "Orthopedic", type: "Speciality" },
  { id: "pop-4", title: "Gynecologist", type: "Speciality" },
  { id: "pop-5", title: "Dentist", type: "Speciality" },
  { id: "pop-6", title: "ENT Specialist", type: "Speciality" },
  { id: "pop-7", title: "Cough & Cold", type: "Symptom" },
  { id: "pop-8", title: "Headache", type: "Symptom" },
  { id: "pop-9", title: "Stomach Pain", type: "Symptom" },
] as const;

export const SEARCH_DIRECTORY: readonly SearchItem[] = [
  ...INITIAL_RECENTS,
  ...POPULAR_SEARCHES,
  { id: "s8", title: "Neurologist", type: "Speciality" },
  { id: "s10", title: "Psychiatrist", type: "Speciality" },
  { id: "sym5", title: "Back pain", type: "Symptom" },
  { id: "sym6", title: "Skin rash", type: "Symptom" },
  { id: "sym8", title: "Breathing issue", type: "Symptom" },
] as const;

export function filterSearchDirectory(query: string): SearchItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  return SEARCH_DIRECTORY.filter(
    (item) =>
      item.title.toLowerCase().includes(trimmed) ||
      item.type.toLowerCase().includes(trimmed)
  );
}

export function findSearchItem(query: string): SearchItem | undefined {
  const trimmed = query.trim().toLowerCase();
  return SEARCH_DIRECTORY.find(
    (item) => item.title.toLowerCase() === trimmed
  );
}

export function getDoctorResultsSearchRoute(
  title: string,
  consultationType: string = "Clinic Visit"
) {
  return {
    pathname: "/doctor-results",
    params: { symptom: title, consultationType },
  } as unknown as Href;
}
