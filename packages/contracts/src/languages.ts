const languageNames: Record<string, string> = {
  en: "English", eng: "English", english: "English",
  hi: "Hindi", hin: "Hindi", hindi: "Hindi",
  kn: "Kannada", kan: "Kannada", kannada: "Kannada",
  ta: "Tamil", tam: "Tamil", tamil: "Tamil",
  te: "Telugu", tel: "Telugu", telugu: "Telugu",
  ml: "Malayalam", mal: "Malayalam", malayalam: "Malayalam",
  gu: "Gujarati", guj: "Gujarati", gujarati: "Gujarati",
  pa: "Punjabi", pan: "Punjabi", punjabi: "Punjabi",
  mr: "Marathi", mar: "Marathi", marathi: "Marathi",
  bn: "Bengali", ben: "Bengali", bengali: "Bengali",
  ur: "Urdu", urd: "Urdu", urdu: "Urdu",
  or: "Odia", ori: "Odia", odia: "Odia",
  as: "Assamese", asm: "Assamese", assamese: "Assamese",
  ne: "Nepali", nep: "Nepali", nepali: "Nepali",
  sa: "Sanskrit", san: "Sanskrit", sanskrit: "Sanskrit",
  sd: "Sindhi", snd: "Sindhi", sindhi: "Sindhi",
  ks: "Kashmiri", kas: "Kashmiri", kashmiri: "Kashmiri",
  kok: "Konkani", konkani: "Konkani",
  mai: "Maithili", maithili: "Maithili",
  mni: "Manipuri", manipuri: "Manipuri",
  doi: "Dogri", dogri: "Dogri",
  es: "Spanish", spa: "Spanish", spanish: "Spanish",
  fr: "French", fra: "French", fre: "French", french: "French",
  de: "German", deu: "German", ger: "German", german: "German",
  ar: "Arabic", ara: "Arabic", arabic: "Arabic",
  zh: "Chinese", zho: "Chinese", chi: "Chinese", chinese: "Chinese",
  ja: "Japanese", jpn: "Japanese", japanese: "Japanese",
};

const canonicalCodes: Record<string, string> = {
  English: "en", Hindi: "hi", Kannada: "kn", Tamil: "ta", Telugu: "te",
  Malayalam: "ml", Gujarati: "gu", Punjabi: "pa", Marathi: "mr",
  Bengali: "bn", Urdu: "ur", Odia: "or", Assamese: "as",
  Nepali: "ne", Sanskrit: "sa", Sindhi: "sd", Kashmiri: "ks", Konkani: "kok",
  Maithili: "mai", Manipuri: "mni", Dogri: "doi", Spanish: "es",
  French: "fr", German: "de", Arabic: "ar", Chinese: "zh",
  Japanese: "ja",
};

export function doctorLanguageName(value: string): string {
  const normalized = value.trim().toLowerCase();
  return languageNames[normalized] ?? languageNames[normalized.split("-")[0]] ?? value.trim();
}

export function doctorLanguageCode(value: string): string {
  const name = doctorLanguageName(value);
  return canonicalCodes[name] ?? value.trim().toLowerCase();
}
