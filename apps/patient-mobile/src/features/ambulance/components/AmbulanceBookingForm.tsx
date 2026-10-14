import { AppText as Text } from "@startup/mobile-ui";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, MapPin, ShieldCheck } from "lucide-react-native";
import { colors, fontFamilies, gradients } from "@startup/design-tokens";
import type { AmbulanceHospital, GoogleHospital, PublicHospital } from "@startup/contracts";
import { Input, Loader, useToastFeedback } from "@startup/mobile-ui";
import { ambulanceTypes, type AmbulanceType } from "../utils/ambulanceConstants";
import {
  ActionButton,
  AmbulanceOption,
  EmergencyModeCard,
  EmergencyNumbers,
  LocationFields,
  SectionTitle,
  Suggestions,
} from "./index";

type HospitalItem = AmbulanceHospital;

const HospitalCard = memo(function HospitalCard({
  hospital,
  selected,
  onPress,
}: {
  hospital: HospitalItem;
  selected: boolean;
  onPress: (hospital: HospitalItem) => void;
}) {
  const handlePress = () => onPress(hospital);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={hospital.name}
      onPress={handlePress}
      style={({ pressed }) => [
        s.hospitalCard,
        selected && s.hospitalSelected,
        pressed && s.pressed,
      ]}
    >
      <View style={s.hospitalPin}><MapPin color={colors.patient.primaryDark} size={20} /></View>
      <View style={s.hospitalCopy}>
        <Text variant="cardHeading" numberOfLines={1} style={s.hospitalName}>{hospital.name}</Text>
        <Text variant="body" numberOfLines={1} style={s.hospitalAddress}>{hospital.address}</Text>
        <View style={s.metaRow}>
          <MapPin color={colors.patient.primaryDark} size={12} />
          <Text variant="body" style={s.meta}>{hospital.distance_meters === null ? "Distance unavailable" : `${(hospital.distance_meters / 1000).toFixed(1)} km away`}</Text>
        </View>
        {"source" in hospital ? <Text variant="body" style={s.googleAttribution}>Google Maps</Text> : null}
      </View>
      {selected ? <Check size={18} color={colors.patient.primaryDark} /> : null}
    </Pressable>
  );
});

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
}: {
  destination: string;
  onDestinationChange: (dest: string) => void;
  hospitalId: string | null;
  onSelectHospital: (hospital: AmbulanceHospital) => void;
  locatingPickup: boolean;
  pickup: { latitude: number; longitude: number } | null;
  pickupAddress: string;
  onPickupAddressChange: (value: string) => void;
  googleHospitals: GoogleHospital[];
  isGoogleLoading: boolean;
  searching: boolean;
  onSearchingChange: (searching: boolean) => void;
  onCurrentLocationPress: () => void;
  hospitalsData: PublicHospital[];
  isHospitalsLoading: boolean;
  isHospitalsError: boolean;
  emergency: boolean;
  onEmergencyChange: (val: boolean) => void;
  type: AmbulanceType["id"];
  onTypeChange: (type: AmbulanceType["id"]) => void;
  isRequestPending: boolean;
  isBookingsLoading: boolean;
  hasActiveBooking: boolean;
  onRequestBooking: () => void;
}) {
  const [needsLandmark, setNeedsLandmark] = useState(false);
  useEffect(() => { setNeedsLandmark(Boolean(pickup) && pickupAddress.trim().length < 5); }, [pickup]);
  const allHospitals = useMemo(() => [...hospitalsData, ...googleHospitals].sort((a, b) =>
    (a.distance_meters ?? Infinity) - (b.distance_meters ?? Infinity) || a.name.localeCompare(b.name)), [hospitalsData, googleHospitals]);
  const nearbyHospitals = allHospitals.slice(0, 3);
  useToastFeedback({ error: isHospitalsError ? "Could not load hospitals." : "" });
  const renderHospital = useCallback(
    ({ item }: { item: AmbulanceHospital }) => (
      <HospitalCard
        hospital={item}
        selected={hospitalId === item.id}
        onPress={onSelectHospital}
      />
    ),
    [hospitalId, onSelectHospital],
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
      {needsLandmark ? <Input label="Pickup address or landmark" value={pickupAddress} onChangeText={onPickupAddressChange} maxLength={500} containerStyle={{ paddingHorizontal: 16, marginTop: 12 }} /> : null}
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

          {googleHospitals.length ? <Text variant="body" style={s.bookingMessage}>Google-listed destinations are external; Clinzo verification and bed availability are not provided.</Text> : null}
          {isGoogleLoading ? <Loader theme="patient" style={{ minHeight: 36 }} /> : null}

          {googleHospitals.flatMap(h => h.attributions).filter((a, i, all) => all.findIndex(item => item.provider === a.provider) === i).map(a => <Text variant="body" key={a.provider} style={s.googleAttribution}>{a.provider}</Text>)}
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

const s = StyleSheet.create({
  googleAttribution: { color: "#5E5E5E", fontFamily: fontFamilies.regular, fontSize: 12 },
  pressed: { opacity: 0.72 },
  headerExtension: {
    height: 0,
    width: "100%",
  },
  bookingContent: { paddingBottom: 40 },
  hospitalList: { gap: 12, paddingHorizontal: 16, paddingBottom: 4 },
  hospitalCard: {
    width: 300, minHeight: 104, flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.borderDefault,
  },
  hospitalSelected: { backgroundColor: colors.patient.surface, borderColor: colors.borderDefault },
  hospitalPin: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.patient.surface },
  hospitalCopy: { flex: 1, minWidth: 0, gap: 4 },
  hospitalName: { color: colors.patient.text, fontFamily: fontFamilies.semibold, fontSize: 15 },
  hospitalAddress: { color: "#71818F", fontFamily: fontFamilies.regular, fontSize: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  meta: { color: colors.patient.primaryDark, fontFamily: fontFamilies.medium, fontSize: 11 },
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
