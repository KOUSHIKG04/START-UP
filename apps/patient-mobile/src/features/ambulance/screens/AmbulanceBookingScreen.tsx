import { getHeaderTitle } from "../utils/ambulancePresentation";
import { useAmbulanceBooking } from "../hooks/useAmbulanceBooking";

import { Keyboard, StyleSheet, View } from "react-native";

import * as Crypto from "expo-crypto";

import { colors, fontFamilies, surfaces } from "@startup/design-tokens";
import { Header } from "@startup/mobile-ui";

import type { AmbulanceBookingScreenProps } from "../types/ambulance";
import {
  AmbulanceCompletion,
  Assigning,
  PickupMap,
  Tracking,
} from "../components/index";
import { AmbulanceBookingForm } from "../components/AmbulanceBookingForm";

export function AmbulanceBookingScreen({
  onBackPress,
  onComplete,
  onFullscreenChange,
}: AmbulanceBookingScreenProps) {
  const {
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
  } = useAmbulanceBooking({ onBackPress, onComplete, onFullscreenChange });
  return (
    <View style={s.screen}>
      <Header
        app="patient"
        title={getHeaderTitle(step)}
        onBackPress={onHeaderBack}
        centered={step === "hospital" || step === "complete"}
      />
      {step === "pickup" ? (
        <PickupMap
          destination={destination}
          address={pickupAddress}
          onAddressChange={setPickupAddress}
          onConfirm={choosePickup}
        />
      ) : step === "assigning" ? (
        <Assigning />
      ) : activeBooking &&
        (step === "tracking" || step === "arrived" || step === "hospital") ? (
        <Tracking
          stage={step}
          booking={activeBooking}
          location={tracking.data ?? null}
          completionPin={pinVisible ? (pin.data ?? null) : null}
          emergency={emergency}
          onEmergencyChange={(value) => {
            if (value)
              showToast({
                title: "Emergency Mode unavailable",
                message:
                  "This booking cannot promise priority dispatch yet. Use the separate SOS flow for emergency dispatch.",
                type: "info",
              });
            else setEmergency(false);
          }}
          onCancel={() => {
            if (activeBooking?.status === "searching") cancel.mutate();
            else
              showToast({
                title: "Cancellation unavailable",
                message:
                  "This assigned trip cannot be cancelled from this screen.",
                type: "info",
              });
          }}
          onProceedToPayment={() => {
            if (activeBooking?.trip_status === "completed")
              void queryClient.invalidateQueries({
                queryKey: ["my-ambulance-bookings"],
              });
            else
              showToast({
                title: "Trip still active",
                message:
                  "The driver must verify the completion PIN at your destination.",
                type: "info",
              });
          }}
        />
      ) : step === "complete" ? (
        completedBooking ? (
          <AmbulanceCompletion
            booking={completedBooking}
            onGoHome={finishBooking}
            onSubmitRating={submitTripRating}
          />
        ) : (
          <Assigning />
        )
      ) : (
        <AmbulanceBookingForm
          destination={destination}
          onDestinationChange={(dest) => {
            setDestination(dest);
            setHospitalId(null);
            setExternalHospital(null);
            setIdempotencyKey(Crypto.randomUUID());
          }}
          hospitalId={externalHospital?.id ?? hospitalId}
          onSelectHospital={(h) => {
            setDestination(h.name);
            if ("source" in h && h.source === "google") {
              setExternalHospital(h);
              setHospitalId(null);
            } else {
              setHospitalId(h.id);
              setExternalHospital(null);
            }
            setSearching(false);
            Keyboard.dismiss();
            setIdempotencyKey(Crypto.randomUUID());
          }}
          locatingPickup={locatingPickup}
          pickup={pickup}
          pickupAddress={pickupAddress}
          searching={searching}
          onSearchingChange={setSearching}
          onCurrentLocationPress={choosePickup}
          onPickupAddressChange={(value) => {
            setPickupAddress(value);
            setIdempotencyKey(Crypto.randomUUID());
          }}
          hospitalsData={hospitals.data ?? []}
          googleHospitals={googleHospitals.data?.places ?? []}
          isGoogleLoading={googleHospitals.isFetching}
          isHospitalsLoading={hospitals.isLoading}
          isHospitalsError={hospitals.isError}
          emergency={emergency}
          onEmergencyChange={(value) => {
            if (value)
              setError(
                "Emergency priority for a selected hospital and ambulance type is not configured. Call 112 or use SOS for urgent help."
              );
            else setEmergency(false);
          }}
          type={type}
          onTypeChange={setType}
          isRequestPending={request.isPending}
          isBookingsLoading={bookings.isLoading}
          hasActiveBooking={Boolean(activeBooking)}
          onRequestBooking={() => request.mutate()}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  pressed: { opacity: 0.72 },
  headerExtension: {
    height: 30,
    width: "100%",
  },
  bookingContent: { paddingBottom: 40 },
  hospitalList: { gap: 12, paddingHorizontal: 16, paddingBottom: 4 },
  hospitalCard: {
    ...surfaces.card,
    width: 128,
    height: 96,
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  hospitalSelected: {
    backgroundColor: "#E8F5F4",
    borderColor: "#E8F5F4",
  },
  hospitalName: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  meta: { color: "#71818F", fontFamily: fontFamilies.regular, fontSize: 10 },
  ambulanceList: { gap: 12, paddingHorizontal: 16 },
  bookButton: { marginHorizontal: 16, marginTop: 22 },
  numbersTitle: { marginTop: 22 },
  safetyNote: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#E8F5F4",
    borderWidth: 1,
    borderColor: "rgba(8, 127, 120, 0.12)",
  },
  safetyNoteText: {
    flex: 1,
    color: "#087F78",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  bookingMessage: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    marginHorizontal: 16,
  },
});
