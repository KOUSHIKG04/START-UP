import * as Location from "expo-location";
import { Platform } from "react-native";
import { resolveMapAddress } from "@startup/data-access";
import { supabase } from "../../services/supabase";
import { formatGeocodedAddress } from "./locationDisplay";

type Point = { latitude: number; longitude: number };
type Address = { address: string; street: string; locality: string; city: string; state: string; pincode: string };
const pending = new Map<string, { promise: Promise<Address>; callers: (() => boolean)[] }>();
// Android geocoder requests are not cancellable. Share duplicate requests and
// serialize different points so dragging cannot overload the native service.
let tail: Promise<unknown> = Promise.resolve();

export function resolveDoctorAddress(point: Point, isCurrent: () => boolean = () => true): Promise<Address> {
  const key = `${point.latitude},${point.longitude}`;
  const current = pending.get(key);
  if (current) { current.callers.push(isCurrent); return current.promise; }
  const callers = [isCurrent];
  const hasCurrentCaller = () => callers.some(check => check());
  const lookup = tail.catch(() => undefined).then(async () => {
    if (!hasCurrentCaller()) throw new Error("Address selection changed.");
    if (Platform.OS === "android") {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Allow location permission in Android settings to fill the address automatically.");
    }
    let deviceError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!hasCurrentCaller()) throw new Error("Address selection changed.");
      try {
        const [address] = await Location.reverseGeocodeAsync(point);
        const label = formatGeocodedAddress(address);
        if (!address || !label) throw new Error("The phone returned no address for this point.");
        return { address: label,
          street: [address.streetNumber, address.street].filter(Boolean).join(" "),
          locality: address.district || address.name || "",
          city: address.city || "", state: address.region || "",
          pincode: address.postalCode?.replace(/\D/g, "").slice(0, 6) ?? "" };
      } catch (cause) { deviceError = cause; }
      if (!attempt) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!hasCurrentCaller()) throw new Error("Address selection changed.");
    if (supabase) {
      const result = await resolveMapAddress(supabase, point);
      if (result.address) return result.address;
      if (result.configured) throw new Error("No address was found here. Select a nearby point or enter the address manually.");
    }
    const reason = deviceError instanceof Error ? deviceError.message : "The phone’s address service is unavailable.";
    throw new Error(`${reason} Google fallback is not configured yet. Search for a place or fill the address manually.`);
  });
  pending.set(key, { promise: lookup, callers }); tail = lookup;
  void lookup.finally(() => { if (pending.get(key)?.promise === lookup) pending.delete(key); }).catch(() => undefined);
  return lookup;
}
