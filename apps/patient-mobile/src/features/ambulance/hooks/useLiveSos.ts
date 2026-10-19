import type { LiveSosScreenProps } from "../types/live-sos-screen";
import { sosDispatchEnabled } from "../utils/sosConstants";
import { useState } from "react";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelMyAmbulanceBooking,
  getMyActiveAmbulanceTracking,
  getMyPatientVerificationPin,
  listMyAmbulanceBookings,
  refreshMyAmbulanceDispatch,
  requestMySos,
  requestOnboardingSos,
} from "@startup/data-access";
import { useToast, type ToastType } from "@startup/mobile-ui";
import {
  mobileSession,
  supabase,
  useMobileSession,
} from "../../../services/supabase";
export function useLiveSos({
  onBackPress,
  onboarding = false,
}: LiveSosScreenProps) {
  const { profile, session } = useMobileSession();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [pickup, setPickup] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [address, setAddress] = useState("");
  const [summary, setSummary] = useState("");
  const [fullName, setFullName] = useState(profile?.display_name ?? "");
  const [contactPhone, setContactPhone] = useState(session?.user.phone ?? "");
  const [requestKey, setRequestKey] = useState(() => Crypto.randomUUID());
  const [locating, setLocating] = useState(false);
  const report = (text: string, type: ToastType) =>
    showToast({
      title: type === "error" ? "SOS action failed" : text,
      message: type === "error" ? text : undefined,
      type,
    });
  const bookings = useQuery({
    queryKey: ["my-ambulance-bookings"],
    queryFn: () => listMyAmbulanceBookings(supabase!),
    enabled: Boolean(supabase && sosDispatchEnabled && profile?.patient_id),
  });
  const active = bookings.data?.find(
    (booking) =>
      booking.booking_type === "sos" &&
      ["awaiting_location", "searching", "assigned"].includes(booking.status)
  );
  const pinVisible =
    active?.trip_status === "in_progress" ||
    active?.trip_status === "arrived_at_destination";
  const verificationPin = useQuery({
    queryKey: ["patient-completion-pin", profile?.patient_id, active?.id],
    queryFn: () => getMyPatientVerificationPin(supabase!, profile!.patient_id!),
    enabled: Boolean(supabase && profile?.patient_id && pinVisible),
  });
  const tracking = useQuery({
    queryKey: ["active-ambulance-tracking", active?.id],
    queryFn: () => getMyActiveAmbulanceTracking(supabase!, active!.id),
    enabled: Boolean(supabase && active?.status === "assigned"),
  });

  async function locate() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("permission denied");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setPickup({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setRequestKey(Crypto.randomUUID());
    } catch {
      report(
        "Current location is required for app dispatch. Call 112 if location access is unavailable.",
        "error"
      );
    } finally {
      setLocating(false);
    }
  }

  const request = useMutation({
    mutationFn: () => {
      if (!sosDispatchEnabled || !supabase || !pickup)
        throw new Error("SOS dispatch unavailable");
      if (onboarding)
        return requestOnboardingSos(supabase, {
          fullName,
          contactPhone,
          pickupLatitude: pickup.latitude,
          pickupLongitude: pickup.longitude,
          pickupAddress: address,
          summary,
          idempotencyKey: requestKey,
        });
      if (!profile?.patient_id) throw new Error("Patient profile unavailable");
      return requestMySos(supabase, {
        patientId: profile.patient_id,
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        pickupAddress: address,
        summary,
        idempotencyKey: requestKey,
      });
    },
    onSuccess: async () => {
      report(
        "Emergency request received. Searching for an approved ALS ambulance.",
        "success"
      );
      if (onboarding) await mobileSession.refresh();
      setRequestKey(Crypto.randomUUID());
      void queryClient.invalidateQueries({
        queryKey: ["my-ambulance-bookings"],
      });
    },
    onError: (cause) =>
      report(
        cause instanceof Error
          ? cause.message
          : "App dispatch is unavailable. Call emergency services now.",
        "error"
      ),
  });
  const cancel = useMutation({
    mutationFn: () =>
      cancelMyAmbulanceBooking(supabase!, {
        bookingId: active!.id,
        expectedVersion: Number(active!.row_version),
      }),
    onSuccess: () => {
      report("SOS request cancelled.", "success");
      void bookings.refetch();
    },
    onError: () =>
      report(
        "Could not cancel. Refresh the request or call emergency services.",
        "error"
      ),
  });
  const refreshDispatch = useMutation({
    mutationFn: () => refreshMyAmbulanceDispatch(supabase!, active!.id),
    onSuccess: () => {
      report("Search refreshed.", "info");
      void bookings.refetch();
    },
    onError: () =>
      report(
        "Could not refresh dispatch. Call emergency services if you still need help.",
        "error"
      ),
  });

  return {
    profile,
    pickup,
    address,
    setAddress,
    summary,
    setSummary,
    fullName,
    setFullName,
    contactPhone,
    setContactPhone,
    setRequestKey,
    locating,
    bookings,
    active,
    pinVisible,
    verificationPin,
    tracking,
    locate,
    request,
    cancel,
    refreshDispatch,
  };
}
