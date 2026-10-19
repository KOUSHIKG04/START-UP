import { SEARCH_DIRECTORY } from "./homeSearchConstants";
import type { SearchItem } from "../types/home";
import type { Href } from "expo-router";
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
  return SEARCH_DIRECTORY.find((item) => item.title.toLowerCase() === trimmed);
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
