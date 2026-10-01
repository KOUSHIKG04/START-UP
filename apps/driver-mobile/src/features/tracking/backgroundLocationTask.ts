import * as Battery from "expo-battery";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { listMyAmbulanceFleet, updateMyDriverLocation } from "@startup/data-access";
import { supabase } from "../../services/supabase";

export const DRIVER_BACKGROUND_LOCATION_TASK = "clinzo-driver-background-location";

// Expo requires background tasks to be defined at module scope when the JS bundle loads.
TaskManager.defineTask(DRIVER_BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !supabase || !data) return;
  try {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) return;
    const fleet = await listMyAmbulanceFleet(supabase);
    const shiftId = fleet.find((item) => item.desired_availability === "online")?.active_shift_id;
    if (!shiftId) {
      if (await Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK);
      }
      return;
    }
    const locations = (data as { locations?: Location.LocationObject[] }).locations;
    const position = locations?.at(-1);
    if (!position || position.coords.accuracy === null || position.coords.accuracy > 1000) return;
    await updateMyDriverLocation(supabase, {
      shiftId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: position.coords.accuracy,
      deviceAt: new Date(position.timestamp).toISOString(),
      streamEpoch: Crypto.randomUUID(),
      sequence: 0,
    });
  } catch {
    // Dispatch excludes stale samples; the next OS-delivered update may retry.
  }
});

export async function startDriverBackgroundLocation() {
  if (!await TaskManager.isAvailableAsync()) return;
  const permission = await Location.getBackgroundPermissionsAsync();
  if (!permission.granted) return;
  if (await Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK)) return;
  let lowPower = false;
  try {
    const power = await Battery.getPowerStateAsync();
    lowPower = power.lowPowerMode || (power.batteryLevel >= 0 && power.batteryLevel < 0.15);
  } catch { /* Battery state is unavailable on some devices. */ }
  await Location.startLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: lowPower ? 60000 : 20000,
    distanceInterval: lowPower ? 100 : 30,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: "Clinzo ambulance shift active",
      notificationBody: "Location sharing is active while you are available for requests.",
      killServiceOnDestroy: true,
    },
  });
}

export async function stopDriverBackgroundLocation() {
  if (await Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK);
  }
}
