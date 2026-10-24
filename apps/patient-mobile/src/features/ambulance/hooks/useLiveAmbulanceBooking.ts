import type { LiveAmbulanceBookingScreenProps } from "../types/live-ambulance-booking-screen";
import { useToastFeedback } from "@startup/mobile-ui";
import { useState } from "react";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelMyAmbulanceBooking,
  getMyPatientVerificationPin,
  getMyActiveAmbulanceTracking,
  listMyAmbulanceBookings,
  listPublicHospitals,
  refreshMyAmbulanceDispatch,
  requestAmbulanceBooking,
} from "@startup/data-access";
import type { RequestAmbulanceBookingInput } from "@startup/contracts";
import { supabase, useMobileSession } from "../../../services/supabase";

export function useLiveAmbulanceBooking({
  onBackPress,
}: LiveAmbulanceBookingScreenProps) {
  const { profile } = useMobileSession();
  const queryClient = useQueryClient();
  const [pickup, setPickup] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [capabilityCode, setCapabilityCode] =
    useState<RequestAmbulanceBookingInput["capabilityCode"]>("BLS");
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    Crypto.randomUUID()
  );
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const hospitals = useQuery({
    queryKey: ["public-hospitals", pickup],
    queryFn: () => listPublicHospitals(supabase!, pickup ?? undefined),
    enabled: !!supabase,
  });
  useToastFeedback({
    error:
      error ||
      (hospitals.isError ? "Could not load hospitals. Try again." : ""),
    success: message,
  });
  const bookings = useQuery({
    queryKey: ["my-ambulance-bookings"],
    queryFn: () => listMyAmbulanceBookings(supabase!),
    enabled: !!supabase,
  });
  const activeBooking = bookings.data?.find(
    (booking) => booking.status === "searching" || booking.status === "assigned"
  );
  const pinVisible =
    activeBooking?.trip_status === "in_progress" ||
    activeBooking?.trip_status === "arrived_at_destination";
  const verificationPin = useQuery({
    queryKey: [
      "patient-completion-pin",
      profile?.patient_id,
      activeBooking?.id,
    ],
    queryFn: () => getMyPatientVerificationPin(supabase!, profile!.patient_id!),
    enabled: Boolean(supabase && profile?.patient_id && pinVisible),
    staleTime: 0,
  });
  const tracking = useQuery({
    queryKey: ["active-ambulance-tracking", activeBooking?.id],
    queryFn: () => getMyActiveAmbulanceTracking(supabase!, activeBooking!.id),
    enabled: Boolean(supabase && activeBooking?.status === "assigned"),
  });

  async function locatePickup() {
    setLocating(true);
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError(
          "Allow location access to request an ambulance from your current position."
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setPickup({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setIdempotencyKey(Crypto.randomUUID());
    } catch {
      setError(
        "Could not get your current location. Check device location settings and try again."
      );
    } finally {
      setLocating(false);
    }
  }

  const request = useMutation({
    mutationFn: () => {
      if (!profile?.patient_id || !pickup || !hospitalId)
        throw new Error("Complete the booking details.");
      return requestAmbulanceBooking(supabase!, {
        patientId: profile.patient_id,
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        pickupAddress,
        destinationFacilityId: hospitalId,
        capabilityCode,
        idempotencyKey,
      });
    },
    onSuccess: () => {
      setError("");
      setMessage("Ambulance request received. Assignment is pending.");
      setIdempotencyKey(Crypto.randomUUID());
      void queryClient.invalidateQueries({
        queryKey: ["my-ambulance-bookings"],
      });
    },
    onError: () =>
      setError(
        "Could not request an ambulance. Check your details or existing active request."
      ),
  });
  const cancel = useMutation({
    mutationFn: (booking: NonNullable<typeof bookings.data>[number]) =>
      cancelMyAmbulanceBooking(supabase!, {
        bookingId: booking.id,
        expectedVersion: Number(booking.row_version),
      }),
    onSuccess: () => {
      setError("");
      setMessage("Ambulance request cancelled.");
      void queryClient.invalidateQueries({
        queryKey: ["my-ambulance-bookings"],
      });
    },
    onError: () =>
      setError(
        "Could not cancel this request. Refresh its status and try again."
      ),
  });
  const refreshDispatch = useMutation({
    mutationFn: (bookingId: string) =>
      refreshMyAmbulanceDispatch(supabase!, bookingId),
    onSuccess: () => {
      setError("");
      setMessage("Search refreshed.");
      void queryClient.invalidateQueries({
        queryKey: ["my-ambulance-bookings"],
      });
    },
    onError: () =>
      setError(
        "Could not refresh matching. Try again after the current search round ends."
      ),
  });

  return {
    pickup,
    pickupAddress,
    setPickupAddress,
    hospitalId,
    setHospitalId,
    capabilityCode,
    setCapabilityCode,
    setIdempotencyKey,
    locating,
    error,
    hospitals,
    bookings,
    activeBooking,
    pinVisible,
    verificationPin,
    tracking,
    locatePickup,
    request,
    cancel,
    refreshDispatch,
  };
}
