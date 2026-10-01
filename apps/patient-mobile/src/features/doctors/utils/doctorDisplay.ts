const languageNames: Record<string, string> = {
  en: "English", hi: "Hindi", kn: "Kannada", ta: "Tamil", te: "Telugu",
  ml: "Malayalam", gu: "Gujarati", pa: "Punjabi", mr: "Marathi",
  bn: "Bengali", ur: "Urdu", or: "Odia", as: "Assamese",
  ne: "Nepali", sa: "Sanskrit", sd: "Sindhi", ks: "Kashmiri",
  kok: "Konkani", mai: "Maithili", mni: "Manipuri", doi: "Dogri",
  es: "Spanish", fr: "French", de: "German", ar: "Arabic",
  zh: "Chinese", ja: "Japanese",
};

export function doctorLanguageName(code: string): string {
  const normalized = code.trim().toLowerCase().split("-")[0];
  return languageNames[normalized] ?? "Other language";
}

export function formatConsultationFee(minor: string, currency: string): string {
  const amount = Number(minor) / 100;
  if (!Number.isFinite(amount)) return "Fee unavailable";
  if (currency === "INR") return `₹${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}
