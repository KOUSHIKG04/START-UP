import { languageNames, canonicalCodes } from "./utils/languageConstants";

export function doctorLanguageName(value: string): string {
  const normalized = value.trim().toLowerCase();
  return (
    languageNames[normalized] ??
    languageNames[normalized.split("-")[0]] ??
    value.trim()
  );
}

export function doctorLanguageCode(value: string): string {
  const name = doctorLanguageName(value);
  return canonicalCodes[name] ?? value.trim().toLowerCase();
}
