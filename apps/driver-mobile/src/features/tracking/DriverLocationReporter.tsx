import { useEffect } from "react";
import { AppState } from "react-native";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { listMyAmbulanceFleet, updateMyDriverLocation } from "@startup/data-access";
import { supabase, useMobileSession } from "../../services/supabase";

export function DriverLocationReporter() {
  const { profile } = useMobileSession();
  const fleet = useQuery({ queryKey: ["driver-fleet", profile?.driver?.id],
    queryFn: () => listMyAmbulanceFleet(supabase!), enabled: Boolean(supabase && profile?.driver?.id),
    refetchInterval: 30000 });
  const shiftId = fleet.data?.find((vehicle) => vehicle.desired_availability === "online")?.active_shift_id;

  useEffect(() => {
    if (!shiftId || !supabase) return;
    const client = supabase;
    let disposed = false;
    let inFlight = false;
    let sequence = 0;
    let subscription: Location.LocationSubscription | undefined;
    const streamEpoch = Crypto.randomUUID();

    async function publish(position: Location.LocationObject) {
      if (disposed || inFlight || AppState.currentState !== "active") return;
      const accuracy = position.coords.accuracy;
      if (accuracy === null || accuracy > 1000) return;
      inFlight = true;
      const nextSequence = ++sequence;
      try {
        await updateMyDriverLocation(client, {
          shiftId: shiftId!, latitude: position.coords.latitude, longitude: position.coords.longitude,
          accuracyMeters: accuracy, deviceAt: new Date(position.timestamp).toISOString(),
          streamEpoch, sequence: nextSequence,
        });
      } catch {
        // The server discards stale or unauthorized locations; retry on the next foreground sample.
      } finally { inFlight = false; }
    }

    async function sample() {
      if (disposed || inFlight || AppState.currentState !== "active") return;
      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await publish(position);
      } catch { /* A stale location is excluded from dispatch and patient tracking. */ }
    }

    void (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted || disposed) return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 20 },
        (position) => { void publish(position); }
      );
      if (disposed) subscription.remove();
      else void sample();
    })();
    const timer = setInterval(() => { void sample(); }, 45000);
    return () => { disposed = true; clearInterval(timer); subscription?.remove(); };
  }, [shiftId]);
  return null;
}
