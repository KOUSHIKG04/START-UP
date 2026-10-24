import type { Point } from "../types/pick-location-screen";

export const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function validPoint(
  latitude: unknown,
  longitude: unknown
): Point | null {
  if (
    latitude === undefined ||
    longitude === undefined ||
    latitude === "" ||
    longitude === ""
  )
    return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
    ? { latitude: lat, longitude: lng }
    : null;
}
