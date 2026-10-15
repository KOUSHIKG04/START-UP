type Place = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  businessStatus?: string;
  attributions?: { provider?: string; providerUri?: string }[];
};
export const hospitalFields =
  "id,displayName,formattedAddress,location,types,businessStatus,attributions";
export function isHospital(value: unknown): boolean {
  const place = value as Place | null;
  return Boolean(
    place &&
    place.businessStatus !== "CLOSED_PERMANENTLY" &&
    place.types?.some((type) =>
      ["hospital", "doctor", "medical_clinic"].includes(type)
    )
  );
}
export function normalizeHospital(
  value: unknown,
  pickup: { latitude: number; longitude: number }
) {
  const p = value as Place;
  const lat = p.location?.latitude,
    lng = p.location?.longitude;
  if (
    !p.id ||
    !/^[A-Za-z0-9_-]{1,300}$/.test(p.id) ||
    !p.displayName?.text ||
    !p.formattedAddress ||
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    return null;
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat - pickup.latitude) * r) / 2) ** 2 +
    Math.cos(lat * r) *
      Math.cos(pickup.latitude * r) *
      Math.sin(((lng - pickup.longitude) * r) / 2) ** 2;
  return {
    id: `google:${p.id}`,
    source: "google" as const,
    place_id: p.id,
    name: p.displayName.text,
    address: p.formattedAddress,
    latitude: lat,
    longitude: lng,
    distance_meters: Math.round(
      12742000 * Math.asin(Math.min(1, Math.sqrt(a)))
    ),
    attributions: (p.attributions ?? [])
      .filter((a) => a.provider)
      .map((a) => ({
        provider: a.provider!,
        ...(a.providerUri ? { uri: a.providerUri } : {}),
      })),
  };
}
