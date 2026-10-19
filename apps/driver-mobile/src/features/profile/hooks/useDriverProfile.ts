import { useState } from "react";
import * as Location from "expo-location";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyDriverProfile,
  listMyAmbulanceFleet,
  setMyDriverAvailability,
} from "@startup/data-access";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import { supabase, useMobileSession } from "../../../services/supabase";
export function useDriverProfile() {
  const { profile } = useMobileSession();
  const { showToast } = useToast();
  const [support, setSupport] = useState(false);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const driver = useQuery({
    queryKey: ["my-driver-profile"],
    queryFn: () => getMyDriverProfile(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
  });

  const fleet = useQuery({
    queryKey: ["driver-fleet", profile?.driver?.id],
    queryFn: () => listMyAmbulanceFleet(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
  });
  useToastFeedback({
    error:
      fleet.isError || driver.isError
        ? "Could not load your partner details."
        : "",
  });

  const photo = useQuery({
    queryKey: ["my-driver-photo", driver.data?.profile_photo_path],
    queryFn: async () => {
      const result = await supabase!.storage
        .from("driver-evidence")
        .createSignedUrl(driver.data!.profile_photo_path!, 3600);
      if (result.error) throw result.error;
      return result.data.signedUrl;
    },
    enabled: Boolean(supabase && driver.data?.profile_photo_path),
  });

  const vehicle =
    fleet.data?.find((item) => item.desired_availability === "online") ??
    fleet.data?.find((item) => item.ready_to_go_available);

  const online = vehicle?.desired_availability === "online";

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
      }

      await setMyDriverAvailability(supabase, {
        vehicleId: vehicle.vehicle_id,
        online: value,
        latitude,
        longitude,
      });
      await queryClient.invalidateQueries({
        queryKey: ["driver-fleet", profile?.driver?.id],
      });
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
    }
  }

  return {
    profile,
    support,
    setSupport,
    busy,
    driver,
    photo,
    vehicle,
    online,
    changeAvailability,
  };
}
