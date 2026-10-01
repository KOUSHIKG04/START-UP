import { memo, useCallback } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Clock3, MapPin, ShieldCheck } from "lucide-react-native";
import { colors, fontFamilies, gradients } from "@startup/design-tokens";
import type { PublicHospital } from "@startup/contracts";
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

interface HospitalItem {
  id: string;
  name: string;
  distance_meters: number | null;
}

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
      onPress={handlePress}
      style={({ pressed }) => [
        s.hospitalCard,
        selected && s.hospitalSelected,
        pressed && s.pressed,
      ]}
    >
      <Text numberOfLines={1} style={s.hospitalName}>
        {hospital.name}
      </Text>
      <View style={s.metaRow}>
        <Clock3 color="#00998D" size={11} />
        <Text style={s.meta}>ETA pending</Text>
        <MapPin color="#00998D" size={11} />
        <Text style={s.meta}>
          {hospital.distance_meters === null
            ? "Distance unavailable"
            : `${(hospital.distance_meters / 1000).toFixed(1)} km`}
        </Text>
      </View>
    </Pressable>
  );
});

export function AmbulanceBookingForm({
  destination,
  onDestinationChange,
  hospitalId,
  onSelectHospital,
  pickup,
  pickupAddress,
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
  error,
  onRequestBooking,
}: {
  destination: string;
  onDestinationChange: (dest: string) => void;
  hospitalId: string | null;
  onSelectHospital: (hospital: { id: string; name: string }) => void;
  pickup: { latitude: number; longitude: number } | null;
  pickupAddress: string;
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
  error: string;
  onRequestBooking: () => void;
}) {
  const renderHospital = useCallback(
    ({ item }: { item: PublicHospital }) => (
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
        destination={destination}
        onChange={(value) => {
          onDestinationChange(value);
          onSearchingChange(true);
        }}
        onFocus={() => onSearchingChange(true)}
        onCurrentLocationPress={onCurrentLocationPress}
      />
      {searching ? (
        <Suggestions
          query={destination}
          hospitals={hospitalsData}
          onSelect={(name) => {
            const h = hospitalsData.find((item) => item.name === name);
            if (h) onSelectHospital(h);
            else onDestinationChange(name);
            onSearchingChange(false);
          }}
          onClose={() => onSearchingChange(false)}
        />
      ) : (
        <>
          <SectionTitle>Select Nearby Hospitals</SectionTitle>
          <FlatList
            horizontal
            data={hospitalsData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.hospitalList}
            showsHorizontalScrollIndicator={false}
            renderItem={renderHospital}
          />

          <EmergencyModeCard
            emergency={emergency}
            onEmergencyChange={onEmergencyChange}
          />

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
            <Text style={s.bookingMessage}>Loading hospitals…</Text>
          ) : null}
          {isHospitalsError ? (
            <Text accessibilityRole="alert" style={s.bookingMessage}>
              Could not load hospitals.
            </Text>
          ) : null}
          {isBookingsLoading ? (
            <Text style={s.bookingMessage}>Checking your active request…</Text>
          ) : null}
          {hasActiveBooking ? (
            <Text style={s.bookingMessage}>
              You already have an active request.
            </Text>
          ) : null}
          {!pickup ? (
            <Text style={s.bookingMessage}>
              Confirm your pickup location before booking.
            </Text>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={s.bookingMessage}>
              {error}
            </Text>
          ) : null}

          <SectionTitle style={s.numbersTitle}>Emergency Numbers</SectionTitle>
          <EmergencyNumbers />

          <View style={s.safetyNote}>
            <ShieldCheck color="#087F78" size={18} />
            <Text style={s.safetyNoteText}>
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
  pressed: { opacity: 0.72 },
  headerExtension: {
    height: 30,
    width: "100%",
  },
  bookingContent: { paddingBottom: 40 },
  hospitalList: { gap: 12, paddingHorizontal: 16, paddingBottom: 4 },
  hospitalCard: {
    width: 128,
    height: 96,
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.borderDefault,
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
