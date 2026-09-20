import { useEffect, useState } from "react";
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Clock3, MapPin, ShieldCheck } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fontFamilies, gradients } from "@startup/design-tokens";
import { Header } from "@startup/mobile-ui";
import {
  ASSIGNING_DELAY_MS,
  HOSPITAL_ARRIVED_DELAY_MS,
  TRACKING_STAGE_DELAY_MS,
  ambulanceTypes,
  nearbyHospitals,
  type AmbulanceFlowStep,
  type AmbulanceType,
} from "../utils/ambulanceConstants";
import type { AmbulanceBookingScreenProps } from "../types/ambulance";
import {
  ActionButton,
  AmbulanceCompletion,
  AmbulanceOption,
  Assigning,
  EmergencyModeCard,
  EmergencyNumbers,
  LocationFields,
  PickupMap,
  SectionTitle,
  Suggestions,
  Tracking,
} from "../components/index";

export function AmbulanceBookingScreen({
  onBackPress,
  onComplete,
  onFullscreenChange,
}: AmbulanceBookingScreenProps) {
  const [step, setStep] = useState<AmbulanceFlowStep>("booking");
  const [destination, setDestination] = useState("");
  const [searching, setSearching] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [type, setType] = useState<AmbulanceType["id"]>("advanced");

  useEffect(() => {
    const next: [AmbulanceFlowStep, number] | undefined =
      step === "assigning"
        ? ["tracking", ASSIGNING_DELAY_MS]
        : step === "tracking"
          ? ["arrived", TRACKING_STAGE_DELAY_MS]
          : step === "arrived"
            ? ["hospital", TRACKING_STAGE_DELAY_MS]
            : step === "hospital"
              ? ["complete", HOSPITAL_ARRIVED_DELAY_MS]
              : undefined;
    if (!next) return undefined;
    const timer = setTimeout(() => setStep(next[0]), next[1]);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    onFullscreenChange?.(step === "pickup" || step === "assigning");
  }, [onFullscreenChange, step]);

  useEffect(() => {
    const onHardwareBack = () => {
      if (searching) {
        setSearching(false);
        return true;
      }
      if (step === "pickup") {
        setStep("booking");
        return true;
      }
      if (step === "assigning") {
        setStep("booking");
        return true;
      }
      if (step === "payment") {
        setStep("hospital");
        return true;
      }
      if (step === "complete") {
        onComplete();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBack
    );
    return () => sub.remove();
  }, [onComplete, searching, step]);

  const handleBack = () => {
    if (searching) {
      setSearching(false);
      return;
    }
    if (step === "pickup") {
      setStep("booking");
      return;
    }
    if (step === "assigning") {
      setStep("booking");
      return;
    }
    if (step === "payment") {
      setStep("hospital");
      return;
    }
    if (step === "complete") {
      onComplete();
      return;
    }
    onBackPress();
  };

  const getHeaderTitle = () => {
    if (step === "pickup") return "Set pickup on map";
    if (
      step === "assigning" ||
      step === "tracking" ||
      step === "arrived" ||
      step === "hospital"
    ) {
      return "Ambulance Tracking";
    }
    if (step === "payment") return "Hospital Handover & Bill";
    if (step === "complete") return "Emergency Handover";
    return "Book Ambulance";
  };

  return (
    <View style={s.screen}>
      <Header
        title={getHeaderTitle()}
        onBackPress={handleBack}
        centered={
          step === "hospital" || step === "payment" || step === "complete"
        }
      />
      {step === "pickup" ? (
        <PickupMap
          destination={destination}
          onConfirm={() => setStep("assigning")}
        />
      ) : step === "assigning" ? (
        <Assigning />
      ) : step === "tracking" || step === "arrived" || step === "hospital" ? (
        <Tracking
          stage={step}
          emergency={emergency}
          onEmergencyChange={setEmergency}
          onCancel={onComplete}
          onProceedToPayment={() => setStep("complete")}
        />
      ) : step === "complete" ? (
        <AmbulanceCompletion onGoHome={onComplete} />
      ) : (
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
              setDestination(value);
              setSearching(true);
            }}
            onFocus={() => setSearching(true)}
            onCurrentLocationPress={() => setStep("pickup")}
          />
          {searching ? (
            <Suggestions
              query={destination}
              onSelect={(name) => {
                setDestination(name);
                setSearching(false);
              }}
              onClose={() => setSearching(false)}
            />
          ) : (
            <>
              <SectionTitle>Select Nearby Hospitals</SectionTitle>
              <ScrollView
                horizontal
                contentContainerStyle={s.hospitalList}
                showsHorizontalScrollIndicator={false}
              >
                {nearbyHospitals.map((hospital, index) => (
                  <Pressable
                    key={hospital.name}
                    onPress={() => setDestination(hospital.name)}
                    style={({ pressed }) => [
                      s.hospitalCard,
                      (destination
                        ? destination === hospital.name
                        : index === 1) && s.hospitalSelected,
                      pressed && s.pressed,
                    ]}
                  >
                    <Text numberOfLines={1} style={s.hospitalName}>
                      {hospital.name}
                    </Text>
                    <View style={s.metaRow}>
                      <Clock3 color="#00998D" size={11} />
                      <Text style={s.meta}>3 min</Text>
                      <MapPin color="#00998D" size={11} />
                      <Text style={s.meta}>1.2 km</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>

              <EmergencyModeCard
                emergency={emergency}
                onEmergencyChange={setEmergency}
              />

              <SectionTitle>Select Ambulance Type</SectionTitle>
              <View style={s.ambulanceList}>
                {ambulanceTypes.map((item) => (
                  <AmbulanceOption
                    key={item.id}
                    item={item}
                    selected={type === item.id}
                    onPress={() => setType(item.id)}
                  />
                ))}
              </View>

              <ActionButton
                label="Book Ambulance Now"
                onPress={() => setStep("assigning")}
                style={s.bookButton}
              />

              <SectionTitle style={s.numbersTitle}>
                Emergency Numbers
              </SectionTitle>
              <EmergencyNumbers />

              <View style={s.safetyNote}>
                <ShieldCheck color="#087F78" size={18} />
                <Text style={s.safetyNoteText}>
                  All ambulances are GPS-tracked & equipped with trained
                  paramedics. Your safety is our priority.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
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
});
