import type { SavedDriverLocation } from "@startup/contracts";
import type { LocationGeocodedAddress } from "expo-location";

export function formatSavedLocation(location: Pick<SavedDriverLocation, "building" | "street" | "locality" | "city" | "state" | "pincode">) {
  return [location.building, location.street, location.locality, location.city, location.state, location.pincode]
    .filter(Boolean).join(", ");
}

export function locationHeadline(location: SavedDriverLocation | undefined) {
  if (!location) return "Choose your location";
  return formatSavedLocation(location) || location.label || "Choose your location";
}

export function formatGeocodedAddress(address: LocationGeocodedAddress | undefined, fallback = "") {
  if (!address) return fallback;
  const parts = [
    [address.streetNumber, address.street].filter(Boolean).join(" "),
    address.name,
    address.district,
    address.subregion,
    address.city,
    address.region,
    address.postalCode,
    address.country,
  ];
  const seen = new Set<string>();
  return parts.filter((part): part is string => {
    const normalized = part?.trim().toLocaleLowerCase() ?? "";
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  }).join(", ") || fallback;
}

export function distanceToSavedLocation(from: { latitude: number; longitude: number } | null, location: SavedDriverLocation) {
  if (!from || location.latitude === null || location.longitude === null) return null;
  const radians = Math.PI / 180;
  const dLat = (location.latitude - from.latitude) * radians;
  const dLng = (location.longitude - from.longitude) * radians;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(from.latitude * radians) * Math.cos(location.latitude * radians) * Math.sin(dLng / 2) ** 2;
  const metres = 12742000 * Math.asin(Math.min(1, Math.sqrt(a)));
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}
