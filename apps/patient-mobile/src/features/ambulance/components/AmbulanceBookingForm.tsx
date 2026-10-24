import { useAmbulanceBookingForm } from "../hooks/useAmbulanceBookingForm";
import { HospitalCard } from "./HospitalCard";
import { s } from "./AmbulanceBookingForm.styles";
import type { AmbulanceBookingFormProps } from "../types/ambulance-booking-form";
import type { HospitalItem } from "../types/ambulance-booking-form";

export type { HospitalItem } from "../types/ambulance-booking-form";

import { AppText as Text } from "@startup/mobile-ui";
import { useCallback } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ShieldCheck } from "lucide-react-native";
import { colors, gradients } from "@startup/design-tokens";
import type { AmbulanceHospital } from "@startup/contracts";
import { Input, Loader } from "@startup/mobile-ui";
import { ambulanceTypes } from "../utils/ambulanceConstants";
import {
  ActionButton,
  AmbulanceOption,
  EmergencyModeCard,
  EmergencyNumbers,
  LocationFields,
  SectionTitle,
  Suggestions,
} from "./index";

export function AmbulanceBookingForm({
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
  const { needsLandmark, allHospitals, nearbyHospitals } =
    useAmbulanceBookingForm({
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
    });
  const renderHospital = useCallback(
    ({ item }: { item: AmbulanceHospital }) => (
      <HospitalCard
        hospital={item}
        selected={hospitalId === item.id}
        onPress={onSelectHospital}
      />
    ),
    [hospitalId, onSelectHospital]
  );
  return (
    <ScrollView
      contentContainerStyle={s.bookingContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={gradients.patientBanner.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.headerExtension}
      />
      <LocationFields
        locating={locatingPickup}
        pickupAddress={pickupAddress}
        destination={destination}
        onChange={(value) => {
          onDestinationChange(value);
          onSearchingChange(true);
        }}
        onFocus={() => onSearchingChange(true)}
        onCurrentLocationPress={onCurrentLocationPress}
      />
      {needsLandmark ? (
        <Input
          label="Pickup address or landmark"
          value={pickupAddress}
          onChangeText={onPickupAddressChange}
          maxLength={500}
          containerStyle={{ paddingHorizontal: 16, marginTop: 12 }}
        />
      ) : null}
      {searching ? (
        <Suggestions
          query={destination}
          hospitals={allHospitals}
          onSelect={(hospital) => {
            onSelectHospital(hospital);
            onSearchingChange(false);
          }}
          onClose={() => onSearchingChange(false)}
        />
      ) : (
        <>
          <EmergencyModeCard
            emergency={emergency}
            onEmergencyChange={onEmergencyChange}
          />

          <SectionTitle>Select Nearby Hospitals</SectionTitle>
          <FlatList
            horizontal
            data={nearbyHospitals}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.hospitalList}
            showsHorizontalScrollIndicator={false}
            renderItem={renderHospital}
          />

          {googleHospitals.length ? (
            <Text variant="body" style={s.bookingMessage}>
              Google-listed destinations are external; Clinzo verification and
              bed availability are not provided.
            </Text>
          ) : null}
          {isGoogleLoading ? (
            <Loader theme="patient" style={{ minHeight: 36 }} />
          ) : null}

          {googleHospitals
            .flatMap((h) => h.attributions)
            .filter(
              (a, i, all) =>
                all.findIndex((item) => item.provider === a.provider) === i
            )
            .map((a) => (
              <Text variant="body" key={a.provider} style={s.googleAttribution}>
                {a.provider}
              </Text>
            ))}
          <SectionTitle>Select Ambulance Type</SectionTitle>
          <View style={s.ambulanceList}>
            {ambulanceTypes.map((item) => (
              <AmbulanceOption
                key={item.id}
                item={item}
                selected={type === item.id}
                onPress={() => onTypeChange(item.id)}
              />
            ))}
          </View>

          <ActionButton
            label="Book Ambulance Now"
            onPress={onRequestBooking}
            disabled={
              isRequestPending ||
              isBookingsLoading ||
              hasActiveBooking ||
              !pickup ||
              !hospitalId ||
              pickupAddress.trim().length < 5
            }
            style={s.bookButton}
          />
          {isHospitalsLoading ? (
            <Loader theme="patient" style={{ minHeight: 36 }} />
          ) : null}
          {isBookingsLoading ? (
            <Loader theme="patient" style={{ minHeight: 36 }} />
          ) : null}
          {hasActiveBooking ? (
            <Text variant="body" style={s.bookingMessage}>
              You already have an active request.
            </Text>
          ) : null}

          <SectionTitle style={s.numbersTitle}>Emergency Numbers</SectionTitle>
          <EmergencyNumbers />

          <View style={s.safetyNote}>
            <ShieldCheck color="#087F78" size={18} />
            <Text variant="label" style={s.safetyNoteText}>
              All ambulances are GPS-tracked & equipped with trained paramedics.
              Your safety is our priority.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
