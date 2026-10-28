import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyDriverLocations,
  getMyDriverProfile,
  listMyAmbulanceFleet,
  listMyDriverOffers,
  listMyDriverTrips,
  respondMyDriverOffer,
  setMyDriverAvailability,
} from "@startup/data-access";
import {
  useToast,
  useToastFeedback,
  useTimeGreeting,
} from "@startup/mobile-ui";
import { supabase, useMobileSession } from "../../../services/supabase";

export function useDriverHome() {
  const { profile } = useMobileSession();
  const greeting = useTimeGreeting();
  const insets = useSafeAreaInsets();
  const [showNotifications, setShowNotifications] = useState(false);
  useEffect(() => {
    router.prefetch("/select-location");
  }, []);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [responding, setResponding] = useState<boolean | null>(null);
  const client = useQueryClient();
  const { showToast } = useToast();
  const driverId = profile?.driver?.id;
  const locations = useQuery({
    queryKey: ["my-driver-locations", driverId],
    queryFn: () => listMyDriverLocations(supabase!),
    enabled: Boolean(supabase && driverId),
  });
  const selectedLocation = locations.data?.find((item) => item.selected);
  const driverProfile = useQuery({
    queryKey: ["my-driver-profile", driverId],
    queryFn: () => getMyDriverProfile(supabase!),
    enabled: Boolean(supabase && driverId),
  });
  useToastFeedback({
    error: locations.isError
      ? "Could not load saved locations. Tap the location to retry."
      : "",
  });
  const fleet = useQuery({
    queryKey: ["driver-fleet", driverId],
    queryFn: () => listMyAmbulanceFleet(supabase!),
    enabled: Boolean(supabase && driverId),
  });
  const offers = useQuery({
    queryKey: ["driver-offers", driverId],
    queryFn: () => listMyDriverOffers(supabase!),
    enabled: Boolean(supabase && driverId),
  });
  useEffect(() => {
    const now = Date.now();
    const deadlines = (offers.data ?? [])
      .map((offer) => Date.parse(offer.expires_at))
      .filter((deadline) => deadline > now);
    if (!deadlines.length) return;
    const timer = setTimeout(
      () => {
        void client.invalidateQueries({
          queryKey: ["driver-offers", driverId],
        });
      },
      Math.min(...deadlines) - now + 50
    );
    return () => clearTimeout(timer);
  }, [offers.data, client, driverId]);
  const trips = useQuery({
    queryKey: ["my-driver-trips", driverId],
    queryFn: () => listMyDriverTrips(supabase!),
    enabled: Boolean(supabase && driverId),
  });
  useToastFeedback({
    error:
      offers.isError || trips.isError || fleet.isError
        ? "Could not refresh requests or status."
        : "",
  });
  const vehicle =
    fleet.data?.find((item) => item.desired_availability === "online") ??
    fleet.data?.find((item) => item.ready_to_go_available);
  const online = vehicle?.desired_availability === "online";
  const active = trips.data?.find(
    (item) => !["completed", "cancelled"].includes(item.status)
  );
  const completedToday =
    trips.data?.filter(
      (item) =>
        item.status === "completed" &&
        item.completed_at &&
        new Date(item.completed_at).toDateString() === new Date().toDateString()
    ).length ?? 0;
  const offer = offers.data?.find(
    (item) =>
      item.status === "pending" && new Date(item.expires_at).getTime() > now
  );
  const remaining = offer
    ? Math.max(
        0,
        Math.ceil((new Date(offer.expires_at).getTime() - now) / 1000)
      )
    : 0;
  useEffect(() => {
    if (!offer) return;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [offer?.id]);
  async function changeAvailability(value: boolean) {
    if (!supabase || !vehicle || busy) return;

    setBusy(true);

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (value) {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (!permission.granted)
          throw new Error("Allow location to go Available.");
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        latitude = position.coords.latitude;
        longitude = position.coords.longitude;

        try {
          await Location.requestBackgroundPermissionsAsync();
        } catch {
          /* Foreground dispatch remains available when background access is denied. */
        }
      }

      await setMyDriverAvailability(supabase, {
        vehicleId: vehicle.vehicle_id,
        online: value,
        latitude,
        longitude,
      });

      await client.invalidateQueries({ queryKey: ["driver-fleet", driverId] });
      showToast({
        title: value ? "You are available" : "You are offline",
        type: "success",
      });
    } catch (cause) {
      const feedback =
        cause instanceof Error
          ? cause.message
          : "Could not update availability.";
      showToast({
        title: "Availability update failed",
        message: feedback,
        type: "error",
      });
    } finally {
      setBusy(false);
      setResponding(null);
    }
  }
  async function respond(accept: boolean) {
    if (!supabase || !offer || busy) return;
    setBusy(true);
    setResponding(accept);
    try {
      await respondMyDriverOffer(supabase, offer.id, accept);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
      await Promise.all([
        client.invalidateQueries({ queryKey: ["driver-offers", driverId] }),
        client.invalidateQueries({ queryKey: ["my-driver-trips", driverId] }),
      ]);
      showToast({
        title: accept ? "Request accepted" : "Request declined",
        type: "success",
      });
      if (accept) router.push("/trip");
    } catch {
      const feedback =
        "The request expired or is no longer available. Refresh and try again.";
      showToast({
        title: "Request unavailable",
        message: feedback,
        type: "error",
      });
    } finally {
      setBusy(false);
      setResponding(null);
    }
  }
  return {
    refresh: () => [
      driverProfile.refetch({ throwOnError: true }),
      fleet.refetch({ throwOnError: true }),
      offers.refetch({ throwOnError: true }),
      trips.refetch({ throwOnError: true }),
      locations.refetch({ throwOnError: true }),
    ],
    greeting,
    insets,
    showNotifications,
    setShowNotifications,
    busy,
    responding,
    selectedLocation,
    driverProfile,
    vehicle,
    online,
    active,
    completedToday,
    offer,
    remaining,
    changeAvailability,
    respond,
  };
}
