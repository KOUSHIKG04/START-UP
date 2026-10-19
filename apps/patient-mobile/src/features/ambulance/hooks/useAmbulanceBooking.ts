import { submitMyAmbulanceReview } from "@startup/data-access";
import { supabase } from "../../../services/supabase";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Keyboard } from "react-native";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { formatGeocodedAddress } from "../../locations/utils/locationDisplay";
import { router, useFocusEffect } from "expo-router";
import { useLocationDraft } from "../../locations/stores/locationDraft";
import * as SecureStore from "expo-secure-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelMyAmbulanceBooking,
  getMyActiveAmbulanceTracking,
  getMyPatientVerificationPin,
  listMyAmbulanceBookings,
  listPublicHospitals,
  searchGoogleAmbulanceHospitals,
  requestGoogleAmbulanceBooking,
  requestAmbulanceBooking,
} from "@startup/data-access";
import { useMobileSession } from "../../../services/supabase";
import {
  type AmbulanceFlowStep,
  type AmbulanceType,
} from "../utils/ambulanceConstants";
import type { GoogleHospital } from "@startup/contracts";
import type { AmbulanceBookingScreenProps } from "../types/ambulance";
export function useAmbulanceBooking({
  onBackPress,
  onComplete,
  onFullscreenChange,
}: AmbulanceBookingScreenProps) {
  const { showToast } = useToast();
  const devicePickupAttempted = useRef(false);
  const manualPickupChosen = useRef(false);
  const [locatingPickup, setLocatingPickup] = useState(false);
  const pickupDraftId = "ambulance-pickup";
  const chosenPickup = useLocationDraft((state) => state.chosen);
  const clearPickup = useLocationDraft((state) => state.clear);
  const [localStep, setLocalStep] = useState<"booking" | "pickup">("booking");
  const [destination, setDestination] = useState("");
  const [externalHospital, setExternalHospital] =
    useState<GoogleHospital | null>(null);
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [pickup, setPickup] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [error, setError] = useState("");
  useToastFeedback({ error });
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    Crypto.randomUUID()
  );
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [type, setType] = useState<AmbulanceType["id"]>("advanced");
  const { profile } = useMobileSession();
  const queryClient = useQueryClient();
  const hospitals = useQuery({
    queryKey: ["public-hospitals", pickup],
    queryFn: () => listPublicHospitals(supabase!, pickup ?? undefined),
    enabled: Boolean(supabase),
  });
  useEffect(() => {
    const timer = setTimeout(
      () => setHospitalSearch(searching ? destination.trim() : ""),
      600
    );
    return () => clearTimeout(timer);
  }, [searching, destination]);
  const googleHospitals = useQuery({
    queryKey: ["google-ambulance-hospitals", pickup, hospitalSearch],
    queryFn: () =>
      searchGoogleAmbulanceHospitals(supabase!, {
        ...pickup!,
        query: hospitalSearch,
      }),
    enabled: Boolean(supabase && profile?.patient_id && pickup),
    retry: false,
    staleTime: 60000,
    gcTime: 0,
  });
  useToastFeedback({
    error: googleHospitals.isError
      ? "Additional hospital search is unavailable. You can still choose a Clinzo hospital."
      : "",
  });
  const bookings = useQuery({
    queryKey: ["my-ambulance-bookings"],
    queryFn: () => listMyAmbulanceBookings(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  const activeBooking = bookings.data?.find(
    (item) => item.status === "searching" || item.status === "assigned"
  );
  useEffect(() => {
    if (bookings.isLoading || activeBooking || devicePickupAttempted.current)
      return;
    devicePickupAttempted.current = true;
    let active = true;
    let finished = false;
    setLocatingPickup(true);
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Allow location access or choose your pickup location on the map."
        );
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const [address] = await Location.reverseGeocodeAsync(
        position.coords
      ).catch(() => []);
      if (!active || manualPickupChosen.current) return;
      setPickup({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setPickupAddress(
        formatGeocodedAddress(address) ||
          `Current location (${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)})`
      );
      setIdempotencyKey(Crypto.randomUUID());
    })()
      .catch((cause) => {
        if (active && !manualPickupChosen.current)
          showToast({
            title: "Choose pickup location",
            message:
              cause instanceof Error
                ? cause.message
                : "Could not get your current location. Choose pickup on the map.",
            type: "info",
          });
      })
      .finally(() => {
        if (active) {
          finished = true;
          setLocatingPickup(false);
        }
      });
    return () => {
      active = false;
      if (!finished) devicePickupAttempted.current = false;
    };
  }, [bookings.isLoading, Boolean(activeBooking)]);
  const completedBooking = currentBookingId
    ? bookings.data?.find(
        (item) => item.id === currentBookingId && item.status === "fulfilled"
      )
    : undefined;
  const tracking = useQuery({
    queryKey: ["active-ambulance-tracking", activeBooking?.id],
    queryFn: () => getMyActiveAmbulanceTracking(supabase!, activeBooking!.id),
    enabled: Boolean(supabase && activeBooking?.status === "assigned"),
  });
  const pinVisible =
    activeBooking?.trip_status === "in_progress" ||
    activeBooking?.trip_status === "arrived_at_destination";
  const pin = useQuery({
    queryKey: ["patient-completion-pin", activeBooking?.id],
    queryFn: () => getMyPatientVerificationPin(supabase!, profile!.patient_id!),
    enabled: Boolean(supabase && profile?.patient_id && pinVisible),
    gcTime: 0,
  });
  const bookingStorageKey = profile?.patient_id
    ? `clinzo-ambulance-current-${profile.patient_id}`
    : null;

  const step: AmbulanceFlowStep = activeBooking
    ? activeBooking.status === "searching"
      ? "assigning"
      : activeBooking.trip_status === "arrived_at_pickup"
        ? "arrived"
        : activeBooking.trip_status === "in_progress" ||
            activeBooking.trip_status === "arrived_at_destination"
          ? "hospital"
          : "tracking"
    : completedBooking
      ? "complete"
      : localStep;

  useEffect(() => {
    setCurrentBookingId(null);
    if (!bookingStorageKey) return;
    let mounted = true;
    void SecureStore.getItemAsync(bookingStorageKey)
      .then((id) => {
        if (mounted) setCurrentBookingId((current) => current ?? id);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [bookingStorageKey]);

  useEffect(() => {
    if (
      !activeBooking ||
      !bookingStorageKey ||
      currentBookingId === activeBooking.id
    )
      return;
    setCurrentBookingId(activeBooking.id);
    void SecureStore.setItemAsync(bookingStorageKey, activeBooking.id).catch(
      () => undefined
    );
  }, [activeBooking?.id, bookingStorageKey, currentBookingId]);

  const setStep = useCallback(
    (next: "booking" | "pickup") => {
      setLocalStep(next);
      onFullscreenChange?.(next === "pickup");
    },
    [onFullscreenChange]
  );

  const finishBooking = useCallback(() => {
    if (bookingStorageKey)
      void SecureStore.deleteItemAsync(bookingStorageKey).catch(
        () => undefined
      );
    setCurrentBookingId(null);
    onComplete();
  }, [bookingStorageKey, onComplete]);

  const request = useMutation({
    mutationFn: async () => {
      if (
        activeBooking ||
        !supabase ||
        !profile?.patient_id ||
        !pickup ||
        (!hospitalId && !externalHospital) ||
        pickupAddress.trim().length < 5
      )
        throw new Error(
          "Confirm pickup and destination, and wait for any active request to finish."
        );
      if (externalHospital)
        return requestGoogleAmbulanceBooking(supabase, {
          patientId: profile.patient_id,
          pickupLatitude: pickup.latitude,
          pickupLongitude: pickup.longitude,
          pickupAddress,
          destinationPlaceId: externalHospital.place_id,
          capabilityCode:
            type === "basic" ? "BLS" : type === "advanced" ? "ALS" : "NICU",
          idempotencyKey,
        });
      return requestAmbulanceBooking(supabase, {
        patientId: profile.patient_id,
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        pickupAddress,
        destinationFacilityId: hospitalId!,
        capabilityCode:
          type === "basic" ? "BLS" : type === "advanced" ? "ALS" : "NICU",
        idempotencyKey,
      });
    },
    onSuccess: (bookingId) => {
      setCurrentBookingId(bookingId);
      if (bookingStorageKey)
        void SecureStore.setItemAsync(bookingStorageKey, bookingId).catch(
          () => undefined
        );
      setError("");
      setIdempotencyKey(Crypto.randomUUID());
      void queryClient.invalidateQueries({
        queryKey: ["my-ambulance-bookings"],
      });
    },
    onError: (cause) =>
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not request an ambulance."
      ),
  });
  const cancel = useMutation({
    mutationFn: () => {
      if (!supabase || !activeBooking || activeBooking.status !== "searching")
        throw new Error("This trip can no longer be cancelled here.");
      return cancelMyAmbulanceBooking(supabase, {
        bookingId: activeBooking.id,
        expectedVersion: Number(activeBooking.row_version),
      });
    },
    onSuccess: () => {
      if (bookingStorageKey)
        void SecureStore.deleteItemAsync(bookingStorageKey).catch(
          () => undefined
        );
      setCurrentBookingId(null);
      void queryClient.invalidateQueries({
        queryKey: ["my-ambulance-bookings"],
      });
      setStep("booking");
    },
    onError: (cause) =>
      showToast({
        title: "Could not cancel booking",
        message: cause instanceof Error ? cause.message : "Please try again.",
        type: "error",
      }),
  });

  useFocusEffect(
    useCallback(() => {
      if (!chosenPickup || chosenPickup.addressId !== pickupDraftId) return;
      manualPickupChosen.current = true;
      setLocatingPickup(false);
      setPickup({
        latitude: chosenPickup.latitude,
        longitude: chosenPickup.longitude,
      });
      setPickupAddress(
        [
          chosenPickup.street,
          chosenPickup.locality,
          chosenPickup.city,
          chosenPickup.state,
          chosenPickup.pincode,
        ]
          .filter(Boolean)
          .join(", ") ||
          `Selected pickup (${chosenPickup.latitude.toFixed(5)}, ${chosenPickup.longitude.toFixed(5)})`
      );
      setIdempotencyKey(Crypto.randomUUID());
      clearPickup();
    }, [chosenPickup, clearPickup])
  );

  function choosePickup() {
    Keyboard.dismiss();
    setSearching(false);
    clearPickup();
    router.push({
      pathname: "/pick-location",
      params: {
        id: pickupDraftId,
        from: "ambulance",
        ...(pickup
          ? {
              latitude: String(pickup.latitude),
              longitude: String(pickup.longitude),
            }
          : {}),
      },
    });
  }

  const handleBack = useCallback(() => {
    if (searching) {
      setSearching(false);
      return true;
    }
    if (step === "pickup") {
      setStep("booking");
      return true;
    }
    if (step === "assigning") {
      onBackPress();
      return true;
    }
    if (step === "complete") {
      finishBooking();
      return true;
    }
    return false;
  }, [searching, step, setStep, onBackPress, finishBooking]);

  useEffect(() => {
    const onHardwareBack = () => handleBack();
    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBack
    );
    return () => sub.remove();
  }, [handleBack]);

  const onHeaderBack = () => {
    if (!handleBack()) {
      onBackPress();
    }
  };

  const submitTripRating = async (rating: number) => {
    if (!supabase) throw new Error("Sign in to rate this trip.");
    await submitMyAmbulanceReview(supabase, completedBooking.id, rating);
    await queryClient.invalidateQueries({
      queryKey: ["my-ambulance-bookings"],
    });
  };
  return {
    showToast,
    locatingPickup,
    destination,
    setDestination,
    externalHospital,
    setExternalHospital,
    hospitalId,
    setHospitalId,
    pickup,
    pickupAddress,
    setPickupAddress,
    setError,
    setIdempotencyKey,
    searching,
    setSearching,
    emergency,
    setEmergency,
    type,
    setType,
    queryClient,
    hospitals,
    googleHospitals,
    bookings,
    activeBooking,
    completedBooking,
    tracking,
    pinVisible,
    pin,
    step,
    finishBooking,
    request,
    cancel,
    choosePickup,
    onHeaderBack,
    submitTripRating,
  };
}
