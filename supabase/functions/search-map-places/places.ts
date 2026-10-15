type Place = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  addressComponents?: { longText?: string; types?: string[] }[];
  attributions?: { provider?: string; providerUri?: string }[];
};
export function normalizeMapPlace(value: unknown) {
  const p = value as Place | null;
  const lat = p?.location?.latitude,
    lng = p?.location?.longitude;
  if (
    !p?.id ||
    !p.formattedAddress ||
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    return null;
  const part = (type: string) =>
    p.addressComponents?.find((c) => c.types?.includes(type))?.longText ?? "";
  return {
    id: p.id,
    name: p.displayName?.text ?? p.formattedAddress,
    address: p.formattedAddress,
    latitude: lat,
    longitude: lng,
    street: [part("street_number"), part("route")].filter(Boolean).join(" "),
    locality:
      part("sublocality_level_1") ||
      part("sublocality") ||
      part("neighborhood"),
    city: part("locality"),
    state: part("administrative_area_level_1"),
    pincode: part("postal_code"),
    attributions: (p.attributions ?? [])
      .filter((a) => a.provider)
      .map((a) => ({
        provider: a.provider!,
        ...(a.providerUri ? { uri: a.providerUri } : {}),
      })),
  };
}
