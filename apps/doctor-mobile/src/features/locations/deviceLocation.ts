import * as Location from "expo-location";

/** Seeds the map only; the doctor confirms the final pin before saving. */
export async function getDoctorDeviceLocation(): Promise<Location.LocationObject> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error("Allow location access in Android settings or search for an address.");
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error("Turn on your phone's Location setting, then try again.");
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const recent = await Location.getLastKnownPositionAsync({
          maxAge: 60_000,
          requiredAccuracy: 100,
        }).catch(() => null);
        if (recent) return recent;
        return Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        });
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Your phone has not returned a location yet. Check Location Accuracy in Android settings, or search for an address.")), 20_000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
