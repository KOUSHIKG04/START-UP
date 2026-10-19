import type { AmbulanceBookingFormProps } from "../types/ambulance-booking-form";
import { useEffect, useMemo, useState } from "react";
import { useToastFeedback } from "@startup/mobile-ui";
export function useAmbulanceBookingForm({
  destination,
  onDestinationChange,
  hospitalId,
  onSelectHospital,
  pickup,
  locatingPickup,
  pickupAddress,
  onPickupAddressChange,
  googleHospitals,
  isGoogleLoading,
  searching,
  onSearchingChange,
  onCurrentLocationPress,
  hospitalsData,
  isHospitalsLoading,
  isHospitalsError,
  emergency,
  onEmergencyChange,
  type,
  onTypeChange,
  isRequestPending,
  isBookingsLoading,
  hasActiveBooking,
  onRequestBooking,
}: AmbulanceBookingFormProps) {
  const [needsLandmark, setNeedsLandmark] = useState(false);
  useEffect(() => {
    setNeedsLandmark(Boolean(pickup) && pickupAddress.trim().length < 5);
  }, [pickup]);
  const allHospitals = useMemo(
    () =>
      [...hospitalsData, ...googleHospitals].sort(
        (a, b) =>
          (a.distance_meters ?? Infinity) - (b.distance_meters ?? Infinity) ||
          a.name.localeCompare(b.name)
      ),
    [hospitalsData, googleHospitals]
  );
  const nearbyHospitals = allHospitals.slice(0, 3);
  useToastFeedback({
    error: isHospitalsError ? "Could not load hospitals." : "",
  });

  return { needsLandmark, allHospitals, nearbyHospitals };
}
